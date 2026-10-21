export const expenseCategories = [
  { key: "cost_of_sales", label: "売上原価", color: "var(--expense-1)" },
  { key: "sga_people", label: "人件費", color: "var(--expense-2)" },
  { key: "sga_cloud", label: "クラウド・通信費", color: "var(--expense-3)" },
  { key: "sga_marketing", label: "広告宣伝費", color: "var(--expense-4)" },
  { key: "sga_rent", label: "地代家賃", color: "var(--expense-5)" },
  { key: "sga_travel", label: "旅費交通費", color: "var(--expense-6)" },
  { key: "sga_other", label: "その他", color: "var(--expense-7)" },
] as const;
