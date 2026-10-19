import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allocateMoney,
  rebalanceMonths,
  monthlyTotals,
  invoiceBalance,
  invoiceStatus,
  summarizeInvoices,
  monthFieldsSchema,
  invoiceFieldsSchema,
  settlementSchema,
  peakSettled,
  type FinanceMonth,
  type Invoice,
  type Settlement,
} from "../lib/operations.ts";
const month: FinanceMonth = {
  id: "m",
  finance_period_id: "p",
  month_index: 0,
  version: 1,
  revenue: 10,
  cost_of_sales: 3,
  sga_people: 2,
  sga_cloud: 1,
  sga_marketing: 1,
  sga_rent: 1,
  sga_travel: 0,
  sga_other: 0,
};
const invoice: Invoice = {
  id: "i",
  finance_period_id: "p",
  kind: "receivable",
  counterparty: "架空の取引先",
  issued_on: "2026-04-01",
  due_on: "2026-10-19",
  amount: 10,
  version: 1,
};
const payments: Settlement[] = [
  { id: "s1", invoice_id: "i", amount: 3, settled_on: "2026-10-01", note: "" },
  { id: "s2", invoice_id: "i", amount: 7, settled_on: "2026-11-01", note: "" },
];
test("whole-yen allocation preserves totals even for one yen and all-zero weights", () => {
  for (const total of [0, 0.000001, 0.000007, 17.1, 100000])
    for (const weights of [[1, 1, 1], [0, 0, 0], Array(72).fill(1)]) {
      const result = allocateMoney(total, weights);
      assert.equal(
        Math.round(result.reduce((a, b) => a + b, 0) * 1e6),
        Math.round(total * 1e6),
      );
      assert.ok(result.every((n) => n >= 0));
    }
});
test("monthly reallocation reconciles annual fields, including a formerly zero expense category", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    ...month,
    id: "m" + i,
    month_index: i,
  }));
  const next = rebalanceMonths(rows, {
    revenue: 200,
    cost_of_sales: 80,
    sga: 0,
  });
  assert.deepEqual(monthlyTotals(next), {
    revenue: 200,
    cost_of_sales: 80,
    sga: 0,
    expenses: 80,
    operatingProfit: 120,
  });
  const again = rebalanceMonths(next, { revenue: 0, cost_of_sales: 0, sga: 7 });
  assert.equal(monthlyTotals(again).sga, 7);
});
test("as-of balances exclude future settlements and invoices not issued yet", () => {
  assert.equal(invoiceBalance(invoice, payments, "2026-10-19"), 7);
  assert.equal(invoiceBalance(invoice, payments, "2026-11-01"), 0);
  const cancelled = payments.map((p) => ({ ...p, voided_on: "2026-11-02" }));
  assert.equal(invoiceBalance(invoice, cancelled, "2026-11-01"), 0);
  assert.equal(invoiceBalance(invoice, cancelled, "2026-11-02"), 10);
  assert.equal(peakSettled(cancelled, "2026-10-01"), 10);
  assert.equal(peakSettled(cancelled, "2026-11-02"), 0);
  assert.equal(invoiceStatus(invoice, payments, "2026-10-19"), "upcoming");
  assert.equal(invoiceStatus(invoice, payments, "2026-10-20"), "overdue");
  assert.equal(
    invoiceStatus({ ...invoice, due_on: null }, payments, "2026-10-19"),
    "undated",
  );
  assert.equal(invoiceStatus(invoice, payments, "2026-03-31"), "unissued");
  assert.equal(summarizeInvoices([invoice], payments, "2026-03-31").total, 0);
  assert.equal(
    summarizeInvoices([invoice], payments, "2026-10-19").upcoming,
    7,
  );
});
test("invalid money/date ranges and extra input keys are rejected", () => {
  const { id, finance_period_id, month_index, version, ...fields } = month;
  assert.equal(monthFieldsSchema.safeParse(fields).success, true);
  assert.equal(monthFieldsSchema.safeParse({ ...fields, revenue: 539285448.846428 }).success, true);
  assert.equal(
    monthFieldsSchema.safeParse({ ...fields, revenue: -1 }).success,
    false,
  );
  assert.equal(
    monthFieldsSchema.safeParse({ ...fields, revenue: 0.0000001 }).success,
    false,
  );
  assert.equal(
    invoiceFieldsSchema.safeParse({
      counterparty: "架空",
      issued_on: "2026-05-01",
      due_on: "2026-04-01",
      amount: 1,
    }).success,
    false,
  );
  assert.equal(
    settlementSchema.safeParse({
      amount: 0,
      settled_on: "2026-01-01",
      note: "",
    }).success,
    false,
  );
  assert.equal(
    settlementSchema.safeParse({
      amount: 1,
      settled_on: "2026-02-30",
      note: "",
    }).success,
    false,
  );
});
