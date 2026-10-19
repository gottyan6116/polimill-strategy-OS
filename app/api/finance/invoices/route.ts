import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFinance } from "@/lib/finance-db";
import {
  invoiceFieldsSchema,
  settlementSchema,
  fiscalYearOf,
  japanDate,
  toYen,
  fromYen,
  peakSettled,
} from "@/lib/operations";
import { body, json, sameOrigin } from "@/lib/http";
const id = z.string().min(1).max(150),
  version = z.number().int().positive();
const create = z
  .object({
    finance_period_id: id,
    kind: z.enum(["receivable", "payable"]),
    fields: invoiceFieldsSchema,
  })
  .strict();
const mutation = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("edit"),
      id,
      version,
      fields: invoiceFieldsSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("settle"),
      id,
      version,
      fields: settlementSchema,
    })
    .strict(),
  z
    .object({ action: z.literal("void"), id, version, settlement_id: id })
    .strict(),
]);
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "許可されていないアクセスです。" }, 403);
  const user = await currentUser();
  if (!user) return json({ error: "ログインしてください。" }, 401);
  const parsed = create.safeParse(await body(request).catch(() => null));
  if (!parsed.success)
    return json({ error: "請求内容・金額・日付を確認してください。" }, 400);
  const { finance_period_id, kind, fields } = parsed.data;
  const data = await getFinance(user);
  const period = data.records.find((r) => r.id === finance_period_id);
  if (!period)
    return json({ error: "対象の事業・年度が見つかりません。" }, 404);
  if (fiscalYearOf(fields.issued_on) !== period.fiscal_year)
    return json(
      { error: "発行日は選択年度の4月1日〜翌年3月31日にしてください。" },
      400,
    );
  const invoiceId = crypto.randomUUID();
  await db().batch([
    db()
      .prepare(
        "INSERT INTO finance_invoices(id,finance_period_id,kind,counterparty,issued_on,due_on,amount) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(
        invoiceId,
        finance_period_id,
        kind,
        fields.counterparty,
        fields.issued_on,
        fields.due_on,
        fields.amount,
      ),
    db()
      .prepare(
        "INSERT INTO audit_log(user_id,entity_type,entity_id,version) VALUES (?,'finance_invoices',?,1)",
      )
      .bind(user.id, invoiceId),
  ]);
  return json({ ok: true, id: invoiceId }, 201);
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "許可されていないアクセスです。" }, 403);
  const user = await currentUser();
  if (!user) return json({ error: "ログインしてください。" }, 401);
  const parsed = mutation.safeParse(await body(request).catch(() => null));
  if (!parsed.success)
    return json({ error: "入力内容・金額・日付を確認してください。" }, 400);
  const input = parsed.data,
    data = await getFinance(user),
    original = data.invoices.find((r) => r.id === input.id);
  if (!original || original.version !== input.version)
    return json(
      { error: "別の更新がありました。明細を読み直してください。" },
      409,
    );
  const history = data.settlements.filter((s) => s.invoice_id === original.id);
  const payments = history.filter(
    (s) => s.invoice_id === original.id && !s.voided_on,
  );
  const statements = [];
  const scope =
    "finance_period_id IN (SELECT p.id FROM finance_periods p JOIN finance_business_units b ON p.business_unit_id=b.id WHERE b.organization_id=?)";
  if (input.action === "edit") {
    const fields = input.fields,
      period = data.records.find((r) => r.id === original.finance_period_id)!;
    if (
      fiscalYearOf(fields.issued_on) !== period.fiscal_year ||
      history.some((p) => p.settled_on < fields.issued_on)
    )
      return json(
        {
          error: "発行日は対象年度内かつ記録済みの入出金日以前にしてください。",
        },
        400,
      );
    if (toYen(fields.amount) < toYen(peakSettled(history)))
      return json(
        { error: "記録済みの入出金額より少ない請求額にはできません。" },
        400,
      );
    statements.push(
      db()
        .prepare(
          `UPDATE finance_invoices SET counterparty=?,issued_on=?,due_on=?,amount=?,version=version+1 WHERE id=? AND version=? AND ${scope} RETURNING id`,
        )
        .bind(
          fields.counterparty,
          fields.issued_on,
          fields.due_on,
          fields.amount,
          original.id,
          original.version,
          user.organization_id,
        ),
    );
  } else if (input.action === "settle") {
    const fields = input.fields;
    if (
      fields.settled_on < original.issued_on ||
      fields.settled_on > japanDate()
    )
      return json(
        { error: "入出金日は発行日以降・本日以前にしてください。" },
        400,
      );
    if (toYen(fields.amount) > toYen(original.amount) - toYen(peakSettled(history, fields.settled_on)))
      return json({ error: "記録額が未入金・未払残高を超えています。取消履歴と記録日も確認してください。" }, 400);
    // Recheck the live balance in the guarded update; a concurrent settlement cannot overpay.
    statements.push(
      db()
        .prepare(
          `UPDATE finance_invoices SET version=version+1 WHERE id=? AND version=? AND ${scope} AND ROUND(amount*1000000)-COALESCE((SELECT SUM(ROUND(amount*1000000)) FROM finance_settlements WHERE invoice_id=? AND voided_on IS NULL),0)>=? RETURNING id`,
        )
        .bind(
          original.id,
          original.version,
          user.organization_id,
          original.id,
          toYen(fields.amount),
        ),
    );
    statements.push(
      db()
        .prepare(
          "INSERT INTO finance_settlements(id,invoice_id,amount,settled_on,note) SELECT ?,?,?,?,? WHERE changes()>0",
        )
        .bind(
          crypto.randomUUID(),
          original.id,
          fromYen(toYen(fields.amount)),
          fields.settled_on,
          fields.note,
        ),
    );
  } else {
    if (!payments.some((p) => p.id === input.settlement_id))
      return json({ error: "有効な入出金記録が見つかりません。" }, 409);
    statements.push(
      db()
        .prepare(
          `UPDATE finance_invoices SET version=version+1 WHERE id=? AND version=? AND ${scope} RETURNING id`,
        )
        .bind(original.id, original.version, user.organization_id),
    );
    statements.push(
      db()
        .prepare(
          "UPDATE finance_settlements SET voided_on=? WHERE id=? AND invoice_id=? AND voided_on IS NULL AND changes()>0",
        )
        .bind(japanDate(), input.settlement_id, original.id),
    );
  }
  statements.push(
    db()
      .prepare(
        "INSERT INTO audit_log(user_id,entity_type,entity_id,version) SELECT ?,'finance_invoices',?,? WHERE changes()>0",
      )
      .bind(user.id, original.id, original.version + 1),
  );
  const results = await db().batch(statements);
  if (!results[0].results.length)
    return json(
      { error: "別の更新がありました。明細を読み直してください。" },
      409,
    );
  return json({ ok: true });
}
