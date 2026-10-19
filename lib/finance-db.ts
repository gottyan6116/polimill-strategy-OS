import { db, type User } from "./db";
import type { BusinessUnit, FinanceRecord, FinanceWorkspace } from "./finance";
export async function getFinance(user: User): Promise<FinanceWorkspace> {
  const [units, records] = await db().batch([
    db()
      .prepare(
        "SELECT id,name,color FROM finance_business_units WHERE organization_id=? ORDER BY rowid",
      )
      .bind(user.organization_id),
    db()
      .prepare(
        "SELECT p.* FROM finance_periods p JOIN finance_business_units b ON p.business_unit_id=b.id WHERE b.organization_id=? ORDER BY p.fiscal_year,b.rowid",
      )
      .bind(user.organization_id),
  ]);
  return {
    units: units.results as BusinessUnit[],
    records: records.results as FinanceRecord[],
  };
}
