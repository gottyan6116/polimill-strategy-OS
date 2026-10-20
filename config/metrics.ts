/** Reporting definitions; these describe existing calculations and do not alter them. */
export const financialDefinitions = {
  scope:'金額単位は百万円、全数値は架空です。全社指標は事業の分子・分母を合算し、事業間取引の消去は見込んでいません。会計基準に準拠した連結財務諸表ではありません。',
  capital:'ROIC ＝ NOPAT ÷ 期首・期末平均投下資本。投下資本 ＝ 売上債権 ＋ 棚卸資産 − 仕入債務 ＋ 営業固定資産（現預金を除外）。総資産 ＝ 現預金 ＋ 売上債権 ＋ 棚卸資産 ＋ 固定資産。自己資本 ＝ 総資産 − 仕入債務 − 短期借入金 − 長期借入金。',
  comparison:'成長率は同じ事業構成の前年度と比較します。前年度がない場合や分母が0以下の指標は「—」です。過年度の変更は後続年度の期首現預金・総資産・投下資本に引き継ぎます。年度ごとの損益・CFの仮説は据え置きます。',
  roic: "税引後営業利益 ÷ 平均投下資本",
  roicDecomposition: "ROIC ＝ NOPAT利益率 × 投下資本回転率",
  nopatMargin: "NOPAT ÷ 売上高",
  capitalTurnover: "売上高 ÷ 平均投下資本",
  averageInvestedCapital: "期首投下資本と期末投下資本の平均",
  nopat: "税引後営業利益は「営業利益 − max(営業利益, 0) × 想定税率」の簡便計算です。赤字の税効果は見込まず、投下資本から現預金を除いています。全社は各事業の利益・資本を合算して算出します。",
  freeCashFlow: "フリーCF ＝ 営業CF ＋ 投資CF。この試算では為替換算差額を見込まず、営業・投資・財務CFの合計を現預金の増減としています。",
} as const;
