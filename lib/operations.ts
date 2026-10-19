import { z } from "zod";
export const toYen = (value: number) => Math.round(value * 1e6);
export const fromYen = (value: number) => value / 1e6;
export const roundMoney = (value: number) => fromYen(toYen(value));
const amount = z
  .number()
  .finite()
  .min(0)
  .max(1e9)
  .refine((n) => n === Number(n.toFixed(6)), {
    message: "金額は1円単位（0.000001百万円）で入力してください。",
  });
export const sgaKeys = [
  "sga_people",
  "sga_cloud",
  "sga_marketing",
  "sga_rent",
  "sga_travel",
  "sga_other",
] as const;
export const monthFieldsSchema = z
  .object({
    revenue: amount,
    cost_of_sales: amount,
    sga_people: amount,
    sga_cloud: amount,
    sga_marketing: amount,
    sga_rent: amount,
    sga_travel: amount,
    sga_other: amount,
  })
  .strict();
export type MonthFields = z.infer<typeof monthFieldsSchema>;
export type FinanceMonth = MonthFields & {
  id: string;
  finance_period_id: string;
  month_index: number;
  version: number;
};
export type Invoice = {
  id: string;
  finance_period_id: string;
  kind: "receivable" | "payable";
  counterparty: string;
  issued_on: string;
  due_on: string | null;
  amount: number;
  version: number;
};
export type Settlement = {
  id: string;
  invoice_id: string;
  amount: number;
  settled_on: string;
  note: string;
  voided_on?: string | null;
};
export const invoiceFieldsSchema = z
  .object({
    counterparty: z.string().trim().min(1).max(200),
    issued_on: z.iso.date(),
    due_on: z.iso.date().nullable(),
    amount: amount.refine((n) => n > 0, {
      message: "請求額は0より大きい金額を入力してください。",
    }),
  })
  .strict()
  .refine((r) => r.due_on === null || r.due_on >= r.issued_on, {
    message: "期日は発行日以降にしてください。",
  });
export const settlementSchema = z
  .object({
    amount: amount.refine((n) => n > 0, {
      message: "記録額は0より大きい金額を入力してください。",
    }),
    settled_on: z.iso.date(),
    note: z.string().trim().max(500),
  })
  .strict();
export function allocateMoney(total: number, weights: number[]): number[] {
  if (!weights.length) {
    if (total !== 0) throw Error("No allocation targets");
    return [];
  }
  const target = toYen(total),
    weightSum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map(
    (w) => target * (weightSum > 0 ? w / weightSum : 1 / weights.length),
  );
  const values = raw.map(Math.floor);
  const ranked = raw
    .map((n, i) => ({ i, f: n - values[i] }))
    .sort((a, b) => b.f - a.f || a.i - b.i);
  let remainder = target - values.reduce((a, b) => a + b, 0);
  for (let i = 0; remainder > 0; i++, remainder--)
    values[ranked[i % ranked.length].i]++;
  return values.map(fromYen);
}
export function monthlyTotals(rows: MonthFields[]) {
  const sum = (keys: (keyof MonthFields)[]) =>
    fromYen(
      rows.reduce((n, r) => n + keys.reduce((s, k) => s + toYen(r[k]), 0), 0),
    );
  const revenue = sum(["revenue"]),
    cost_of_sales = sum(["cost_of_sales"]),
    sga = sum([...sgaKeys]);
  const expenses = roundMoney(cost_of_sales + sga);
  return {
    revenue,
    cost_of_sales,
    sga,
    expenses,
    operatingProfit: roundMoney(revenue - expenses),
  };
}
export function rebalanceMonths(
  rows: FinanceMonth[],
  annual: { revenue: number; cost_of_sales: number; sga: number },
): FinanceMonth[] {
  const ordered = [...rows].sort((a, b) => a.month_index - b.month_index);
  const revenue = allocateMoney(
    annual.revenue,
    ordered.map((r) => r.revenue),
  );
  const costs = allocateMoney(
    annual.cost_of_sales,
    ordered.map((r) => r.cost_of_sales),
  );
  const expenses = allocateMoney(
    annual.sga,
    ordered.flatMap((r) => sgaKeys.map((k) => r[k])),
  );
  return ordered.map((r, i) => ({
    ...r,
    revenue: revenue[i],
    cost_of_sales: costs[i],
    ...Object.fromEntries(
      sgaKeys.map((k, j) => [k, expenses[i * sgaKeys.length + j]]),
    ),
  }));
}
export function invoiceBalance(
  invoice: Invoice,
  settlements: Settlement[],
  asOf: string,
): number {
  if (invoice.issued_on > asOf) return 0;
  const paid = settlements
    .filter(
      (s) =>
        s.invoice_id === invoice.id &&
        s.settled_on <= asOf &&
        (!s.voided_on || s.voided_on > asOf),
    )
    .reduce((n, s) => n + toYen(s.amount), 0);
  return fromYen(Math.max(0, toYen(invoice.amount) - paid));
}
// Include cancelled rows until their cancellation date when checking historical capacity.
export function peakSettled(settlements: Settlement[], from = "0000-01-01") {
  const dates = new Set([from]);
  for (const row of settlements) {
    if (row.settled_on >= from) dates.add(row.settled_on);
    if (row.voided_on && row.voided_on >= from) dates.add(row.voided_on);
  }
  let peak = 0;
  for (const date of dates) {
    const paid = settlements.filter((s) => s.settled_on <= date && (!s.voided_on || s.voided_on > date)).reduce((n, s) => n + toYen(s.amount), 0);
    peak = Math.max(peak, paid);
  }
  return fromYen(peak);
}
export function invoiceStatus(
  invoice: Invoice,
  settlements: Settlement[],
  asOf: string,
) {
  if (invoice.issued_on > asOf) return "unissued";
  if (invoiceBalance(invoice, settlements, asOf) === 0) return "settled";
  if (invoice.due_on === null) return "undated";
  return invoice.due_on < asOf ? "overdue" : "upcoming";
}
export function summarizeInvoices(
  invoices: Invoice[],
  settlements: Settlement[],
  asOf: string,
) {
  const result = { undated: 0, overdue: 0, upcoming: 0, total: 0, count: 0 };
  for (const invoice of invoices) {
    const status = invoiceStatus(invoice, settlements, asOf);
    if (status === "unissued" || status === "settled") continue;
    result[status] = roundMoney(
      result[status] + invoiceBalance(invoice, settlements, asOf),
    );
    result.count++;
  }
  result.total = roundMoney(result.undated + result.overdue + result.upcoming);
  return result;
}
export const fiscalYearOf = (date: string) =>
  Number(date.slice(0, 4)) - (Number(date.slice(5, 7)) < 4 ? 1 : 0);
export const monthLabel = (index: number) => `${((index + 3) % 12) + 1}月`;
export function japanDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export const expenseCategories = [
  { key: "cost_of_sales", label: "売上原価", color: "#173d5b" },
  { key: "sga_people", label: "人件費", color: "#1aada5" },
  { key: "sga_cloud", label: "クラウド・通信費", color: "#4a86c5" },
  { key: "sga_marketing", label: "広告宣伝費", color: "#d8934a" },
  { key: "sga_rent", label: "地代家賃", color: "#899bc0" },
  { key: "sga_travel", label: "旅費交通費", color: "#b07f98" },
  { key: "sga_other", label: "その他", color: "#a1b2bf" },
] as const;
