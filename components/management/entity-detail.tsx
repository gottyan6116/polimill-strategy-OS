"use client";
import { useEffect, useRef, useState } from "react";
import type { Workspace, Kpi } from "@/lib/model";
import { statusLabels } from "@/lib/model";
import type { EditRecord } from "../edit-dialog";
import { getKpiConfig, evaluationLabels, managementConfig } from "@/config/management";
import { kpiEvaluation, milestoneProgress, type Milestone } from "@/lib/management";
import { number, percent } from "../finance/format";
import {latestKpiPeriod} from '@/lib/reporting';
import {fiscalYearOf} from '@/lib/operations';
import TrendChart from "../trend-chart";
import MilestoneEditor from "./milestone-editor";
export type DetailTarget={kind:"kpi"|"initiative"|"department";id:string};
export const kpiNumber=(value:number|null,kpi:Kpi)=>value===null?"未設定":`${number(value,kpi.unit.includes("%")?1:0)}${kpi.unit}`;
export const kpiPeriod=(kpi:Kpi,data:Workspace)=>latestKpiPeriod(data,kpi.id);
export default function EntityDetail({ target,data,onClose,onEdit,onSaved,onFinance,onNavigate }: { target:DetailTarget;data:Workspace;onClose:()=>void;onEdit:(item:EditRecord)=>void;onSaved:()=>Promise<void>;onFinance:()=>void;onNavigate:(target:DetailTarget)=>void }) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [milestone,setMilestone]=useState<Milestone|"new"|null>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  useEffect(()=>{setMilestone(null);},[target.id]);
  const kpi=target.kind==="kpi"?data.kpis.find(k=>k.id===target.id):undefined;
  const initiative=target.kind==="initiative"?data.initiatives.find(i=>i.id===target.id):undefined;
  const department=target.kind==="department"?data.departments.find(d=>d.id===target.id):undefined;
  const title=kpi?.name??initiative?.title??department?.name??"項目が見つかりません";
  const goal=data.goals.find(g=>g.id===(kpi?.goal_id??initiative?.goal_id));
  const config=kpi?getKpiConfig(kpi,data.management?.values):null;
  const period=kpi?kpiPeriod(kpi,data):"";
  const planYear=/^\d{4}-\d{2}$/.test(period)?fiscalYearOf(period):managementConfig.fiscalYear;
  const planMonths=Array.from({length:12},(_,i)=>{const m=(i+3)%12+1;return {label:m,period:String(planYear+(m<4?1:0))+'-'+String(m).padStart(2,'0')};});
  const periodActual=kpi?data.history.find(h=>h.kpi_id===kpi.id&&h.month===period)?.value??null:null;
  const evaluation=kpi&&config?kpiEvaluation({...kpi,actual:periodActual},config,period):null;
  const rows=(data.management?.milestones??[]).filter(m=>m.initiative_id===initiative?.id).sort((a,b)=>a.planned_on.localeCompare(b.planned_on));
  const edit=(item:EditRecord)=>{onClose();onEdit(item);};
  return <dialog ref={dialog} className="entity-detail" onCancel={onClose} aria-labelledby="entity-detail-title">
    <header><div><p className="management-muted">{target.kind==="kpi"?"KPI詳細":target.kind==="initiative"?"施策詳細":"組織詳細"}</p><h2 id="entity-detail-title">{title}</h2></div><button type="button" onClick={onClose}>閉じる</button></header>
    {goal&&<p className="management-muted">目標：{goal.title} ／ 部門：{data.departments.find(d=>d.id===goal.department_id)?.name??"未設定"}</p>}
    {kpi&&config&&evaluation&&<>
      <div className="management-actions"><button onClick={()=>edit({kind:"kpis",record:kpi})}>KPIを編集</button></div>
      <dl className="management-facts"><div><dt>定義</dt><dd>{config.definition??"未設定"}</dd></div><div><dt>改善の方向</dt><dd>{config.direction==="down"?"小さいほど良い":"大きいほど良い"}</dd></div><div><dt>責任者</dt><dd>{config.owner??goal?.owner??"未設定"}</dd></div><div><dt>年目標</dt><dd>{kpiNumber(kpi.target,kpi)}</dd></div><div><dt>現在の実績</dt><dd>{kpiNumber(kpi.actual,kpi)}</dd></div><div><dt>対象月実績（{period}）</dt><dd>{kpiNumber(periodActual,kpi)}</dd></div><div><dt>対象月計画（{period}）</dt><dd>{kpiNumber(evaluation.plan,kpi)}</dd></div><div><dt>達成率・状態</dt><dd>{percent(evaluation.achievement)} ／ {evaluationLabels[evaluation.status]}</dd></div><div><dt>判定閾値（対象月計画の達成率）</dt><dd>順調 {percent(config.thresholds.onTrack)}以上 ／ 要注意 {percent(config.thresholds.attention)}以上 ／ 未達 {percent(config.thresholds.attention)}未満</dd></div></dl>
      <h3>対象月実績の出所・更新状況</h3>
      {(()=>{const value=(data.management?.values??[]).filter(v=>v.entity_type==="kpi"&&v.entity_id===kpi.id&&v.scenario==="actual"&&v.period===period).sort((a,b)=>b.period.localeCompare(a.period))[0];return <p className="management-muted">出所：{value?.source??"未設定"} ／ 更新：{value?.updated_at??"未設定"} ／ {value?(value.is_closed?"締め済み":"未締め・仮実績"):"締め状況未設定"}</p>;})()}
      <p className="management-muted">現在値の最終更新：{kpi.updated_at??"未設定"}。現在値と対象月実績は別の記録です。</p><h3>月次実績と対象月計画</h3><TrendChart kpi={kpi} history={data.history} values={data.management?.values}/>
      <div className="management-table-scroll"><table><caption>{planYear}年度 月別計画（{kpi.unit}）</caption><thead><tr>{planMonths.map(m=><th className="numeric" key={m.period}>{m.label}月</th>)}</tr></thead><tbody><tr>{planMonths.map(m=>{const month=m.period;return <td className="numeric" key={month}>{config.monthlyPlan[month]===undefined||config.monthlyPlan[month]===null?"未設定":number(config.monthlyPlan[month],kpi.unit.includes("%")?1:0)}</td>;})}</tr></tbody></table></div>
      <h3>関連施策</h3><p className="management-muted">同じ部門目標に属する施策です。KPIへの直接の紐づけは未設定です。</p><ul className="org-related-initiatives">{data.initiatives.filter(i=>i.goal_id===kpi.goal_id).map(i=><li key={i.id}><button aria-label={i.title+'の施策詳細'} onClick={()=>onNavigate({kind:'initiative',id:i.id})}>{i.title}</button><span className="management-muted"> ／ {i.owner||'未設定'}</span></li>)}</ul>{!data.initiatives.some(i=>i.goal_id===kpi.goal_id)&&<p className="management-muted">関連施策は未設定です。</p>}
      <h3>財務への接続</h3>{!config.financialLinks?.length&&<p className="management-muted">財務リンクは未設定です。</p>}<ul className="financial-link-tree"><li>{kpi.name}<ul>{(config.financialLinks??[]).map((link,i)=><li key={i}>{link.label} {!link.confirmed&&<span className="management-muted">（未確認）</span>}<ul><li>{link.metric==="revenue"?"売上":"コスト"}<ul><li>営業利益<ul><li><button onClick={()=>{onClose();onFinance();}}>ROICを確認</button></li></ul></li></ul></li></ul></li>)}</ul></li></ul><p className="management-muted">構造上の接続を示します。未確認の因果関係や金額影響は計算していません。</p>
    </>}
    {initiative&&<>
      <div className="management-actions"><button onClick={()=>edit({kind:"initiatives",record:initiative})}>施策を編集</button></div>
      <dl className="management-facts"><div><dt>責任者</dt><dd>{initiative.owner||"未設定"}</dd></div><div><dt>期限</dt><dd>{initiative.due_date||"未設定"}</dd></div><div><dt>状態</dt><dd>{statusLabels[initiative.status]}</dd></div><div><dt>マイルストーン進捗</dt><dd>{milestoneProgress(rows)===null?"未設定":percent(milestoneProgress(rows))}（完了 {rows.filter(m=>m.completed_on).length} / 全 {rows.length} 件）</dd></div></dl>
      <p className="management-muted">旧自己申告進捗（保存記録）：{percent(initiative.progress)}。現在の進捗計算には使用しません。</p>
      <h3>マイルストーン</h3><div className="management-table-scroll"><table><thead><tr><th>名称</th><th>予定日</th><th>完了日</th><th>操作</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td>{m.title}</td><td>{m.planned_on}</td><td>{m.completed_on??"未完了"}</td><td><button onClick={()=>setMilestone(m)}>編集</button></td></tr>)}</tbody></table></div>
      {!rows.length&&<p className="management-muted">マイルストーンは未設定です。</p>}
      {milestone?<MilestoneEditor key={milestone==="new"?"new":milestone.id} initiativeId={initiative.id} item={milestone==="new"?undefined:milestone} onSaved={onSaved} onCancel={()=>setMilestone(null)}/>:<button onClick={()=>setMilestone("new")}>マイルストーンを追加</button>}
    </>}
    {department&&<><dl className="management-facts"><div><dt>ミッション</dt><dd>{department.mission||"未設定"}</dd></div><div><dt>責任者</dt><dd>{department.owner||"未設定"}</dd></div></dl><h3>部門の全目標</h3>{data.goals.filter(g=>g.department_id===department.id).map(g=><section className="department-goal" key={g.id}><div className="management-goal-heading"><h4>{g.title}</h4><button onClick={()=>edit({kind:"goals",record:g})}>目標を編集</button></div><p>{g.hypothesis}</p><p className="management-muted">担当：{g.owner||"未設定"}</p><h5>KPI</h5><ul>{data.kpis.filter(k=>k.goal_id===g.id).map(k=><li key={k.id}><button className="management-link" onClick={()=>onNavigate({kind:"kpi",id:k.id})}>{k.name}</button></li>)}</ul><h5>施策</h5><ul>{data.initiatives.filter(i=>i.goal_id===g.id).map(i=><li key={i.id}><button className="management-link" onClick={()=>onNavigate({kind:"initiative",id:i.id})}>{i.title}</button></li>)}</ul></section>)}{!data.goals.some(g=>g.department_id===department.id)&&<p>目標は未設定です。</p>}</>}
  </dialog>;
}
