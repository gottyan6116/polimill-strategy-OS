import { db, type User } from "./db";
import type { BusinessUnit, FinanceRecord, FinanceWorkspace } from "./finance";
import type { FinanceMonth, Invoice, Settlement } from "./operations";
export async function getFinance(user: User): Promise<FinanceWorkspace> {
  const [units, records, months, invoices, settlements] = await db().batch([
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
    db()
      .prepare(
        "SELECT m.* FROM finance_months m JOIN finance_periods p ON m.finance_period_id=p.id JOIN finance_business_units b ON p.business_unit_id=b.id WHERE b.organization_id=? ORDER BY p.fiscal_year,m.month_index",
      )
      .bind(user.organization_id),
    db()
      .prepare(
        "SELECT i.* FROM finance_invoices i JOIN finance_periods p ON i.finance_period_id=p.id JOIN finance_business_units b ON p.business_unit_id=b.id WHERE b.organization_id=? ORDER BY i.issued_on,i.id",
      )
      .bind(user.organization_id),
    db()
      .prepare(
        "SELECT s.* FROM finance_settlements s JOIN finance_invoices i ON s.invoice_id=i.id JOIN finance_periods p ON i.finance_period_id=p.id JOIN finance_business_units b ON p.business_unit_id=b.id WHERE b.organization_id=? ORDER BY s.settled_on,s.id",
      )
      .bind(user.organization_id),
  ]);
  return {
    units: units.results as BusinessUnit[],
    records: records.results as FinanceRecord[],
    months: months.results as FinanceMonth[],
    invoices: invoices.results as Invoice[],
    settlements: settlements.results as Settlement[],
  };
}
