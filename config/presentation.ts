/** Shared reporting presentation; values remain in million JPY. */
export const presentation = {
  typography: { chart: 14 },
  precision: { money: 0, number: 1, percent: 1, count: 0, times: 2 },
  units: { money: "百万円", percent: "%", count: "件" },
  chart: { grid: "#e5e7eb", axis: "#899398", text: "#59646b", positive: "#177d75", negative: "#b94c4c", actual: "#177d75", forecast: "#a9ceca", budget: "#6b7280", total: "#37434a" },
  series: ["#177d75", "#657b91", "#a78963", "#525e6b"],
  business: ["#526d82", "#8b7893", "#b39670"],
  portfolio: { growthReferencePercent: 0, targetRoicPercent: 0, growthReferenceLabel: "基準成長率", targetRoicLabel: "目標ROIC",growthReferenceConfigured:false,targetRoicConfigured:false },
} as const;
