import { db, type User } from "./db";
import { getFinance } from "./finance-db";
import {
  carryForward,
  financeFieldsSchema,
  type FinanceFields,
} from "./finance";
import {
  monthlyTotals,
  rebalanceMonths,
  monthFieldsSchema,
  roundMoney,
  toYen,
  type MonthFields,
  type FinanceMonth,
} from "./operations";
import { json } from "./http";
type Mutation = { id: string; version: number } & (
  | { fields: FinanceFields; month?: never }
  | {
      fields?: never;
      month: { id: string; version: number; fields: MonthFields };
    }
);
export async function updateFinance(user: User, input: Mutation) {
  const { id, version } = input;
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
  const periodMonths = workspace.months.filter(
    (m) => m.finance_period_id === id,
  );
  if (periodMonths.length !== 12)
    return json(
      { error: "月次データが揃っていません。再読み込みしてください。" },
      409,
    );
  let fields: FinanceFields;
  let monthlyUpdates: FinanceMonth[] = [];
  if (input.month) {
    const originalMonth = periodMonths.find((m) => m.id === input.month.id);
    if (!originalMonth || originalMonth.version !== input.month.version)
      return json(
        { error: "別の月次更新がありました。再読み込みしてください。" },
        409,
      );
    monthlyUpdates = [{ ...originalMonth, ...input.month.fields }];
    const totals = monthlyTotals(
      periodMonths.map((m) =>
        m.id === originalMonth.id ? monthlyUpdates[0] : m,
      ),
    );
    fields = {
      ...Object.fromEntries(
        Object.keys(financeFieldsSchema.shape).map((k) => [
          k,
          original[k as keyof FinanceFields],
        ]),
      ),
      revenue: totals.revenue,
      cost_of_sales: totals.cost_of_sales,
      sga: totals.sga,
    } as FinanceFields;
  } else {
    fields = Object.fromEntries(
      Object.entries(input.fields).map(([k, v]) => [
        k,
        k === "tax_rate" ? v : roundMoney(v),
      ]),
    ) as FinanceFields;
    if (
      ["revenue", "cost_of_sales", "sga"].some(
        (k) =>
          toYen(fields[k as keyof FinanceFields]) !==
          toYen(original[k as keyof FinanceFields]),
      )
    )
      monthlyUpdates = rebalanceMonths(periodMonths, fields);
  }
  if (!financeFieldsSchema.safeParse(fields).success)
    return json(
      { error: "年度合計または残高が入力できる範囲を超えています。" },
      400,
    );
  const previous = chain.find(
    (r) => r.fiscal_year === original.fiscal_year - 1,
  );
  const openingKeys = [
    "opening_cash",
    "opening_assets",
    "opening_invested_capital",
  ] as const;
  if (
    previous &&
    openingKeys.some((k) => toYen(fields[k]) !== toYen(original[k]))
  )
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
  for (const month of monthlyUpdates) {
    const keys = Object.keys(monthFieldsSchema.shape) as (keyof MonthFields)[];
    statements.push(
      sql
        .prepare(
          `UPDATE finance_months SET ${keys.map((k) => `${k}=?`).join(",")},version=version+1 WHERE id=? AND changes()>0`,
        )
        .bind(...keys.map((k) => month[k]), month.id),
    );
    statements.push(
      sql
        .prepare(
          "INSERT INTO audit_log(user_id,entity_type,entity_id,version) SELECT ?,'finance_months',?,? WHERE changes()>0",
        )
        .bind(user.id, month.id, month.version + 1),
    );
  }
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
