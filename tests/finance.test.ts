import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateFinance,
  consolidateFinance,
  carryForward,
  financeFieldsSchema,
  type FinanceRecord,
} from "../lib/finance.ts";
const base: FinanceRecord = {
  id: "a",
  business_unit_id: "u1",
  fiscal_year: 2025,
  version: 1,
  revenue: 100,
  cost_of_sales: 40,
  sga: 20,
  tax_rate: 0.3,
  opening_invested_capital: 80,
  opening_assets: 130,
  opening_cash: 20,
  receivables: 20,
  inventory: 5,
  payables: 10,
  fixed_assets: 65,
  short_term_debt: 10,
  long_term_debt: 20,
  operating_cf: 30,
  investing_cf: -10,
  financing_cf: -5,
};
test("ROIC decomposes exactly and cash/balance sheet reconcile", () => {
  const m = calculateFinance(base);
  assert.equal(m.operatingProfit, 40);
  assert.equal(m.nopat, 28);
  assert.equal(m.closingCash, 35);
  assert.equal(m.investedCapital, 80);
  assert.equal(m.roic, 35);
  assert.ok(Math.abs(m.nopatMargin! * m.capitalTurnover! - m.roic!) < 1e-9);
  assert.equal(m.totalAssets, m.equity + m.liabilities);
  assert.equal(m.freeCashFlow, 20);
});
test("consolidated ratios are weighted; tax losses are not offset across businesses", () => {
  const small = {
    ...base,
    id: "b",
    business_unit_id: "u2",
    revenue: 10,
    cost_of_sales: 5,
    sga: 10,
    opening_invested_capital: 10,
    receivables: 5,
    inventory: 0,
    payables: 0,
    fixed_assets: 5,
  };
  const m = consolidateFinance([base, small]);
  assert.equal(m.revenue, 110);
  assert.equal(m.nopat, 23);
  assert.equal(m.roic, (23 / 90) * 100);
  assert.notEqual(
    m.roic,
    (calculateFinance(base).roic! + calculateFinance(small).roic!) / 2,
  );
});
test("missing/zero denominator and incomparable prior periods are not shown as zero", () => {
  assert.equal(
    calculateFinance({ ...base, revenue: 0, cost_of_sales: 0, sga: 0 })
      .operatingMargin,
    null,
  );
  assert.equal(
    calculateFinance({
      ...base,
      opening_invested_capital: 0,
      receivables: 0,
      inventory: 0,
      payables: 0,
      fixed_assets: 0,
    }).roic,
    null,
  );
  assert.equal(calculateFinance(base).revenueGrowth, null);
  assert.equal(
    calculateFinance(base, { ...base, revenue: 0 }).revenueGrowth,
    null,
  );
  assert.equal(
    consolidateFinance([base], [{ ...base, business_unit_id: "other" }])
      .revenueGrowth,
    null,
  );
});
test("history changes carry cash, capital and assets forward in order", () => {
  const later = { ...base, id: "b", fiscal_year: 2026, opening_cash: 0 };
  const chain = carryForward([{ ...base, operating_cf: 40 }, later]);
  assert.equal(chain[1].opening_cash, 45);
  assert.equal(chain[1].opening_invested_capital, 80);
  assert.equal(chain[1].opening_assets, 135);
  assert.equal(calculateFinance(chain[1]).closingCash, 60);
});
test("financial inputs reject invalid tax, negative revenue, unexpected keys and negative closing cash", () => {
  const { id, business_unit_id, fiscal_year, version, ...fields } = base;
  assert.equal(financeFieldsSchema.safeParse(fields).success, true);
  for (const change of [
    { tax_rate: 1.1 },
    { revenue: -1 },
    { unexpected: 5 },
    { operating_cf: -1000 },
  ])
    assert.equal(
      financeFieldsSchema.safeParse({ ...fields, ...change }).success,
      false,
    );
});
