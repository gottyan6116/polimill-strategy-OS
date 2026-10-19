import { z } from "zod";
const nonnegative = z.number().finite().min(0).max(1e9);
const signed = z.number().finite().min(-1e9).max(1e9);
export const financeFieldsSchema = z
  .object({
    revenue: nonnegative,
    cost_of_sales: nonnegative,
    sga: nonnegative,
    tax_rate: z.number().finite().min(0).max(1),
    opening_invested_capital: nonnegative,
    opening_assets: nonnegative,
    opening_cash: nonnegative,
    receivables: nonnegative,
    inventory: nonnegative,
    payables: nonnegative,
    fixed_assets: nonnegative,
    short_term_debt: nonnegative,
    long_term_debt: nonnegative,
    operating_cf: signed,
    investing_cf: signed,
    financing_cf: signed,
  })
  .strict()
  .refine(
    (r) =>
      r.opening_cash + r.operating_cf + r.investing_cf + r.financing_cf >= 0,
    {
      message:
        "期末現預金がマイナスになります。資金調達を含めて入力を確認してください。",
    },
  );
export type FinanceFields = z.infer<typeof financeFieldsSchema>;
export type FinanceRecord = FinanceFields & {
  id: string;
  business_unit_id: string;
  fiscal_year: number;
  version: number;
};
export type BusinessUnit = { id: string; name: string; color: string };
export type FinanceWorkspace = {
  units: BusinessUnit[];
  records: FinanceRecord[];
};
const ratio = (n: number, d: number, scale = 1) =>
  d > 0 ? (n / d) * scale : null;
function metrics(
  r: FinanceFields,
  nopat: number,
  operatingTax: number,
  priorRevenue: number | null,
) {
  const operatingProfit = r.revenue - r.cost_of_sales - r.sga;
  const freeCashFlow = r.operating_cf + r.investing_cf;
  const netCashFlow = freeCashFlow + r.financing_cf;
  const closingCash = r.opening_cash + netCashFlow;
  const workingCapital = r.receivables + r.inventory - r.payables;
  const investedCapital = workingCapital + r.fixed_assets;
  const averageInvestedCapital =
    (r.opening_invested_capital + investedCapital) / 2;
  const currentAssets = closingCash + r.receivables + r.inventory;
  const totalAssets = currentAssets + r.fixed_assets;
  const currentLiabilities = r.payables + r.short_term_debt;
  const liabilities = currentLiabilities + r.long_term_debt;
  const equity = totalAssets - liabilities;
  return {
    revenue: r.revenue,
    costOfSales: r.cost_of_sales,
    sga: r.sga,
    operatingProfit,
    operatingTax,
    nopat,
    freeCashFlow,
    netCashFlow,
    closingCash,
    openingCash: r.opening_cash,
    operatingCf: r.operating_cf,
    investingCf: r.investing_cf,
    financingCf: r.financing_cf,
    workingCapital,
    investedCapital,
    averageInvestedCapital,
    currentAssets,
    totalAssets,
    currentLiabilities,
    liabilities,
    equity,
    roic: ratio(nopat, averageInvestedCapital, 100),
    nopatMargin: ratio(nopat, r.revenue, 100),
    operatingMargin: ratio(operatingProfit, r.revenue, 100),
    grossMargin: ratio(r.revenue - r.cost_of_sales, r.revenue, 100),
    capitalTurnover: ratio(r.revenue, averageInvestedCapital),
    assetTurnover: ratio(r.revenue, (r.opening_assets + totalAssets) / 2),
    currentRatio: ratio(currentAssets, currentLiabilities, 100),
    equityRatio: ratio(equity, totalAssets, 100),
    revenueGrowth:
      priorRevenue === null
        ? null
        : ratio(r.revenue - priorRevenue, priorRevenue, 100),
    cashConversion: ratio(r.operating_cf, operatingProfit, 100),
  };
}
export type FinanceMetrics = ReturnType<typeof metrics>;
export function calculateFinance(
  record: FinanceRecord,
  previous?: FinanceRecord,
): FinanceMetrics {
  const profit = record.revenue - record.cost_of_sales - record.sga;
  const tax = Math.max(profit, 0) * record.tax_rate;
  const comparable =
    previous?.business_unit_id === record.business_unit_id &&
    previous.fiscal_year === record.fiscal_year - 1;
  return metrics(
    record,
    profit - tax,
    tax,
    comparable ? previous.revenue : null,
  );
}
export function consolidateFinance(
  records: FinanceRecord[],
  previous: FinanceRecord[] = [],
): FinanceMetrics {
  const keys = Object.keys(
    financeFieldsSchema.shape,
  ) as (keyof FinanceFields)[];
  const totals = Object.fromEntries(
    keys.map((k) => [k, records.reduce((n, r) => n + r[k], 0)]),
  ) as FinanceFields;
  const parts = records.map((r) => calculateFinance(r));
  const comparable =
    records.length > 0 &&
    records.length === previous.length &&
    records.every((r) =>
      previous.some(
        (p) =>
          p.business_unit_id === r.business_unit_id &&
          p.fiscal_year === r.fiscal_year - 1,
      ),
    );
  return metrics(
    totals,
    parts.reduce((n, p) => n + p.nopat, 0),
    parts.reduce((n, p) => n + p.operatingTax, 0),
    comparable ? previous.reduce((n, p) => n + p.revenue, 0) : null,
  );
}
export function carryForward(records: FinanceRecord[]): FinanceRecord[] {
  const result: FinanceRecord[] = [];
  for (const row of [...records].sort(
    (a, b) => a.fiscal_year - b.fiscal_year,
  )) {
    const previous = result.find(
      (r) =>
        r.business_unit_id === row.business_unit_id &&
        r.fiscal_year === row.fiscal_year - 1,
    );
    if (previous) {
      const m = calculateFinance(previous);
      result.push({
        ...row,
        opening_cash: m.closingCash,
        opening_invested_capital: m.investedCapital,
        opening_assets: m.totalAssets,
      });
    } else result.push({ ...row });
  }
  return result;
}
export const financeFieldGroups = [
  {
    title: "損益",
    fields: [
      ["revenue", "売上高"],
      ["cost_of_sales", "売上原価"],
      ["sga", "販売費・一般管理費"],
      ["tax_rate", "想定税率（0〜1）"],
    ],
  },
  {
    title: "営業資産・負債",
    fields: [
      ["receivables", "売上債権"],
      ["inventory", "棚卸資産"],
      ["payables", "仕入債務"],
      ["fixed_assets", "営業固定資産（純額）"],
      ["short_term_debt", "短期借入金"],
      ["long_term_debt", "長期借入金"],
    ],
  },
  {
    title: "キャッシュフロー",
    fields: [
      ["operating_cf", "営業CF"],
      ["investing_cf", "投資CF"],
      ["financing_cf", "財務CF"],
    ],
  },
  {
    title: "期首残高",
    fields: [
      ["opening_cash", "期首現預金"],
      ["opening_invested_capital", "期首投下資本"],
      ["opening_assets", "期首総資産"],
    ],
  },
] as const;
