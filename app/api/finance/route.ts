import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFinance } from "@/lib/finance-db";
import {
  carryForward,
  financeFieldsSchema,
  type FinanceFields,
} from "@/lib/finance";
import { body, json, sameOrigin } from "@/lib/http";
const edit = z
  .object({
    id: z.string().min(1).max(100),
    version: z.number().int().positive(),
    fields: financeFieldsSchema,
  })
  .strict();
export async function GET() {
  const user = await currentUser();
  if (!user) return json({ error: "ログインしてください。" }, 401);
  return json(await getFinance(user));
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "許可されていないアクセスです。" }, 403);
  const user = await currentUser();
  if (!user) return json({ error: "ログインしてください。" }, 401);
  const parsed = edit.safeParse(await body(request).catch(() => null));
  if (!parsed.success)
    return json(
      {
        error:
          parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
      },
      400,
    );
  const { id, version, fields } = parsed.data;
  const workspace = await getFinance(user);
  const original = workspace.records.find((r) => r.id === id);
  if (!original || original.version !== version)
    return json(
      { error: "別の更新がありました。最新のデータを読み直してください。" },
      409,
    );
  const chain = workspace.records
    .filter((r) => r.business_unit_id === original.business_unit_id)
    .sort((a, b) => a.fiscal_year - b.fiscal_year);
  const previous = chain.find(
    (r) => r.fiscal_year === original.fiscal_year - 1,
  );
  const openingKeys = [
    "opening_cash",
    "opening_assets",
    "opening_invested_capital",
  ] as const;
  if (previous && openingKeys.some((k) => fields[k] !== original[k]))
    return json(
      {
        error:
          "期首残高は前年度から引き継ぐため、前年度の数値を編集してください。",
      },
      400,
    );
  const projected = carryForward(
    chain.map((r) => (r.id === id ? { ...r, ...fields } : r)),
  );
  if (
    projected.some(
      (r) =>
        !financeFieldsSchema.safeParse(
          Object.fromEntries(
            Object.keys(fields).map((k) => [k, r[k as keyof FinanceFields]]),
          ),
        ).success,
    )
  )
    return json(
      {
        error:
          "後続年度の残高が成立しません。現預金・投下資本を確認してください。",
      },
      400,
    );
  const affected = chain.filter((r) => r.fiscal_year >= original.fiscal_year);
  // Guard every affected snapshot; concurrent later-period edits must not invalidate carry-forward validation.
  const guard = affected.map(() => "(id=? AND version=?)").join(" OR ");
  const keys = Object.keys(fields) as (keyof FinanceFields)[];
  const sql = db();
  const statements = [
    sql
      .prepare(
        `UPDATE finance_periods SET ${keys.map((k) => `${k}=?`).join(",")},version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND business_unit_id IN (SELECT id FROM finance_business_units WHERE organization_id=?) AND (SELECT COUNT(*) FROM finance_periods WHERE ${guard})=? RETURNING id`,
      )
      .bind(
        ...keys.map((k) => fields[k]),
        id,
        version,
        user.organization_id,
        ...affected.flatMap((r) => [r.id, r.version]),
        affected.length,
      ),
    sql
      .prepare(
        "INSERT INTO audit_log(user_id,entity_type,entity_id,version) SELECT ?,'finance_periods',?,? WHERE changes()>0",
      )
      .bind(user.id, id, version + 1),
  ];
  for (let i = 1; i < affected.length; i++) {
    const target = affected[i],
      prior = affected[i - 1];
    // Only contiguous years are carried. Transaction gating relies on changes() from the preceding statement.
    if (target.fiscal_year !== prior.fiscal_year + 1) break;
    const cash = "p.opening_cash+p.operating_cf+p.investing_cf+p.financing_cf";
    statements.push(
      sql
        .prepare(
          `UPDATE finance_periods SET opening_cash=(SELECT ${cash} FROM finance_periods p WHERE p.id=?), opening_assets=(SELECT ${cash}+p.receivables+p.inventory+p.fixed_assets FROM finance_periods p WHERE p.id=?), opening_invested_capital=(SELECT p.receivables+p.inventory-p.payables+p.fixed_assets FROM finance_periods p WHERE p.id=?),version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND changes()>0`,
        )
        .bind(prior.id, prior.id, prior.id, target.id),
    );
    statements.push(
      sql
        .prepare(
          "INSERT INTO audit_log(user_id,entity_type,entity_id,version) SELECT ?,'finance_periods',?,? WHERE changes()>0",
        )
        .bind(user.id, target.id, target.version + 1),
    );
  }
  const results = await sql.batch(statements);
  if (!results[0].results.length)
    return json(
      { error: "別の更新がありました。最新のデータを読み直してください。" },
      409,
    );
  return json({ ok: true, affectedYears: affected.map((r) => r.fiscal_year) });
}
