"use client";
import {useState} from 'react';
import type {Workspace} from '@/lib/model';
import type {FinanceWorkspace} from '@/lib/finance';
import type {ExceptionRow} from '@/lib/reporting';
import {executiveModel,executivePeriods,defaultExecutiveFilters,groupTrend,type ExecutiveFilters} from '@/lib/executive';
import {executiveConfig as config} from '@/config/executive';
import {evaluationLabels} from '@/config/management';
import type {DetailTarget} from './entity-detail';
import {SummaryFilters,ExecutiveCards,PriorityKpiTable} from './executive-controls';
import {ComparisonChart,StatusStack,DonutChart} from './executive-charts';
import SummaryAudit from './summary-audit';
import './executive.css';
type Props={data:Workspace;finance:FinanceWorkspace|null;onSaved:()=>Promise<void>;onException:(row:ExceptionRow)=>void;onFinance:()=>void;onDetail:(target:DetailTarget)=>void};
export default function ExecutiveSummary({data,finance,onSaved,onException,onFinance,onDetail}:Props){
 const [filters,setFilters]=useState<ExecutiveFilters>(defaultExecutiveFilters),[draft,setDraft]=useState<ExecutiveFilters>(defaultExecutiveFilters),[grain,setGrain]=useState<'month'|'quarter'|'year'>('month');
 if(!finance)return <section className="executive-bi exec-loading" role="status" aria-busy="true"><div/><div/><div/><p>経営サマリーの仮実績・KPIデータを読み込んでいます。</p></section>;
 const periods=executivePeriods(data,finance),effective=periods.some(p=>p.value===filters.period)?filters:{...filters,period:periods[0]?.value??defaultExecutiveFilters.period},model=executiveModel(data,finance,effective);
 const apply=(value:ExecutiveFilters)=>{setFilters(value);setDraft(value)};
 const openKpi=(id:string)=>onDetail({kind:'kpi',id,period:model.kpis.find(k=>k.id===id)?.period??model.range.end});
 const scopeFinance=model.financialAvailable?{...model.scopedFinance,invoices:finance.invoices.filter(i=>model.scopedFinance.records.some(r=>r.id===i.finance_period_id&&r.fiscal_year===model.range.year))}:{...finance,records:[],months:[],invoices:[],units:[]};
 const scopeWorkspace={...data,kpis:data.kpis.filter(k=>model.kpis.some(r=>r.id===k.id)),initiatives:data.initiatives.filter(i=>data.goals.some(g=>g.id===i.goal_id&&(!effective.department||g.department_id===effective.department))&&(!(effective.category||effective.status)||model.kpis.some(k=>k.goal_id===i.goal_id))),history:data.history.filter(h=>h.month>=model.range.start&&h.month<=model.range.end)};
 return <div className="executive-bi">
  <SummaryFilters data={data} periods={periods.length?periods:[{value:effective.period,label:'利用可能な期間は未設定'}]} draft={{...draft,period:periods.some(p=>p.value===draft.period)?draft.period:effective.period}} onChange={setDraft} onApply={()=>apply(draft)} onReset={()=>apply({...defaultExecutiveFilters,period:periods[0]?.value??defaultExecutiveFilters.period})} pending={JSON.stringify(draft)!==JSON.stringify(filters)}/>
  <ExecutiveCards cards={model.cards} onKpi={openKpi}/>
  {!model.financialAvailable&&<p className="exec-scope-note" role="status">{model.financialNote} 財務表示は未設定とし、全社売上を部門へ配賦していません。</p>}
  <div className="exec-chart-grid exec-first-row">
   <section className="exec-panel" aria-labelledby="exec-revenue-title"><header><h2 id="exec-revenue-title">売上高の推移（目標 vs 実績）</h2></header><div className="exec-grain" role="group" aria-label="売上推移の集計期間">{([['month','月次'],['quarter','四半期'],['year','年次']] as const).map(([key,label])=><button key={key} aria-pressed={grain===key} onClick={()=>setGrain(key)}>{label}</button>)}</div><ComparisonChart rows={groupTrend(model.trend,grain)}/><p className="exec-panel-note">未締めの仮実績を含みます。月別目標は登録値のみ。年度目標を月割りしていません。</p></section>
   <section className="exec-panel" aria-labelledby="exec-department-title"><header><h2 id="exec-department-title">部門別KPIステータス</h2></header><StatusStack rows={model.departments} onSelect={id=>onDetail({kind:'department',id})}/><p className="exec-panel-note">部門別売上の紐づけがないため、KPI件数で比較します。部門名から詳細へ。</p></section>
   <section className="exec-panel" aria-labelledby="exec-status-title"><header><h2 id="exec-status-title">KPI状態割合</h2></header><DonutChart caption="選択条件に合うKPIの判定状態" unit="指標" slices={model.states.map(s=>({id:s.key,label:evaluationLabels[s.key],value:s.count,color:config.colors[s.key]}))}/><p className="exec-panel-note">既存の対象月計画・方向・閾値で判定。未判定を進行中と読み替えません。</p></section>
  </div>
  <div className="exec-chart-grid exec-second-row">
   <section className="exec-panel" aria-labelledby="exec-category-title"><header><h2 id="exec-category-title">カテゴリ別KPIステータス構成</h2></header><StatusStack normalized rows={model.categories} onSelect={category=>apply({...effective,category})}/><p className="exec-panel-note">カテゴリ未登録の指標は「未設定」。分類名から絞り込めます。</p></section>
   <section className="exec-panel" aria-labelledby="exec-annual-title"><header><h2 id="exec-annual-title">年度別売上・利益比較</h2></header><ComparisonChart annual rows={model.annual}/><p className="exec-panel-note">対象年度までの通期実績を比較。選択月だけの集計とは異なります。</p></section>
   <section className="exec-panel" aria-labelledby="exec-composition-title"><header><h2 id="exec-composition-title">売上構成比（事業別）</h2><button className="exec-link" onClick={onFinance}>財務分析へ</button></header><DonutChart caption="選択期間の事業別売上構成比" unit="百万円" slices={model.composition.map((s,i)=>({...s,color:config.businessColors[i%config.businessColors.length]}))}/><p className="exec-panel-note">部門に架空配賦せず、収益を管理する事業単位で表示します。</p></section>
  </div>
  <PriorityKpiTable key={JSON.stringify(effective)} rows={model.kpis} onDetail={openKpi}/>
  <details className="exec-audit"><summary>予算・資金・例外・データの鮮度を確認</summary><p className="exec-panel-note">補足情報は選択期間が属する年度の通期比較です。部門等の財務紐づけがない場合は未設定です。</p><SummaryAudit data={scopeWorkspace} finance={scopeFinance} year={model.range.year} onSaved={onSaved} onException={row=>row.kind==='kpi'?openKpi(row.entityId):onException(row)} onFinance={onFinance}/></details>
 </div>;
}
