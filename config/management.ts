export type KpiConfiguration = {
  definition?: string;
  direction?: 'up' | 'down';
  monthlyPlan: Record<string, number | null>;
  thresholds: { onTrack: number; attention: number };
  owner?: string | null;
  financialLinks?: { label: string; metric: string; confirmed: boolean }[];
};
const config = (definition: string, owner: string): KpiConfiguration => ({
  definition, owner, monthlyPlan: {}, thresholds: { onTrack: 100, attention: 80 },
  financialLinks: [{ label: '営業利益 → ROIC（因果・金額影響は未確認）', metric: 'operatingProfit', confirmed: false }],
});
export const kpiConfig: Record<string, KpiConfiguration> = {
  'kpi-participation': config('月間アクティブ参加者数。集計条件は要確認。', 'プロダクト責任者（仮）'),
  'kpi-onboarding': config('初回参加を完了した利用者の割合。分母は要確認。', 'プロダクト責任者（仮）'),
  'kpi-satisfaction': config('利用者満足度。調査方法・分母は要確認。', '品質担当（仮）'),
  'kpi-partners': config('実証パートナー自治体数。集計条件は要確認。', '事業開発責任者（仮）'),
  'kpi-retention': config('翌月も参加した利用者の割合。集計条件は要確認。', 'コミュニティ責任者（仮）'),
  'kpi-review': config('月次目標レビューの実施割合。分母は要確認。', '管理責任者（仮）'),
};
export function getKpiConfig(kpi: {id: string; direction: 'up' | 'down'},values:{entity_type:string;entity_id:string;metric:string;scenario:string;period:string;value:number|null}[]=[]): KpiConfiguration {
  const configured = kpiConfig[kpi.id];
  const registered=Object.fromEntries(values.filter(v=>v.entity_type==='kpi'&&v.entity_id===kpi.id&&v.metric==='actual'&&v.scenario==='budget'&&/^\d{4}-\d{2}$/.test(v.period)).map(v=>[v.period,v.value]));
  return { ...configured, monthlyPlan: {...registered,...configured?.monthlyPlan}, thresholds: configured?.thresholds ?? {onTrack:100,attention:80}, direction: configured?.direction ?? kpi.direction };
}

const driverLabels: Record<string,string> = {
 'kpi-participation':'参加者数 → 売上要因（関係・単価未確認）',
 'kpi-onboarding':'初回参加完了率 → 売上要因（関係未確認）',
 'kpi-satisfaction':'満足度 → 継続売上（関係未確認）',
 'kpi-partners':'実証パートナー自治体数 × 単価（単価未設定）',
 'kpi-retention':'継続参加率 → 継続売上（関係未確認）',
 'kpi-review':'レビュー実施率 → 販管費要因（関係未確認）',
};
for (const [id, label] of Object.entries(driverLabels)) kpiConfig[id].financialLinks = [{label,metric:id==='kpi-review'?'sga':'revenue',confirmed:false}];
export const evaluationLabels = {on_track:'順調',attention:'要注意',missed:'未達',unset:'未判定'};
export const managementConfig = {overdueWarningMillion:0,fiscalYear:2026};
