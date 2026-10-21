/** Shared reporting presentation; values remain in million JPY. */
export const presentation = {
  typography: { chart: 14 },
  precision: { money: 0, number: 1, percent: 1, count: 0, times: 2 },
  units: { money: "百万円", percent: "%", count: "件" },
  chart: { grid: "var(--chart-grid)", axis: "var(--chart-axis)", text: "var(--muted)", positive: "var(--accent)", negative: "var(--danger)", actual: "var(--accent)", forecast: "var(--chart-forecast)", budget: "var(--chart-budget)", total: "var(--ink)" },
  series: ["var(--accent)", "var(--series-2)", "var(--series-3)", "var(--series-4)"],
  business: ["var(--business-1)", "var(--business-2)", "var(--business-3)"],
  portfolio: { growthReferencePercent: 0, targetRoicPercent: 0, growthReferenceLabel: "基準成長率", targetRoicLabel: "目標ROIC",growthReferenceConfigured:false,targetRoicConfigured:false },
} as const;
