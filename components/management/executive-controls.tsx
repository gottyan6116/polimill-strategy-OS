"use client";
import {useState} from 'react';
import {RotateCcw,Coins,Users,ListChecks,ChartNoAxesCombined} from 'lucide-react';
import type {Workspace} from '@/lib/model';
import type {ExecutiveFilters,ExecutiveCard,ExecutiveKpi} from '@/lib/executive';
import {executiveConfig} from '@/config/executive';
import {evaluationLabels} from '@/config/management';
import {number,money,percent} from '../finance/format';
export function SummaryFilters({data,periods,draft,onChange,onApply,onReset,pending}:{data:Workspace;periods:{value:string;label:string}[];draft:ExecutiveFilters;onChange:(value:ExecutiveFilters)=>void;onApply:()=>void;onReset:()=>void;pending:boolean}){
 const categoryIds=[...new Set(data.kpis.map(k=>executiveConfig.categoryByKpi[k.id]??'__unset'))];
 const select=(key:keyof ExecutiveFilters,label:string,options:{value:string;label:string}[])=><label>{label}<select aria-label={`サマリーの${label}`} value={draft[key]} onChange={e=>onChange({...draft,[key]:e.target.value})}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
 return <form className="exec-filters" aria-label="経営サマリーの絞り込み" onSubmit={e=>{e.preventDefault();onApply()}}>
  {select('period','対象期間',periods)}{select('organization','組織',[{value:'',label:'すべての組織'},{value:data.organization.id,label:data.organization.name}])}{select('department','部門',[{value:'',label:'すべての部門'},...data.departments.map(d=>({value:d.id,label:d.name}))])}{select('category','KPIカテゴリ',[{value:'',label:'すべてのカテゴリ'},...categoryIds.map(id=>({value:id,label:executiveConfig.categoryLabels[id]??'未設定'}))])}{select('status','ステータス',[{value:'',label:'すべての状態'},...executiveConfig.statuses.map(s=>({value:s,label:evaluationLabels[s]}))])}
  <div className="exec-filter-actions"><button type="button" className="exec-reset" onClick={onReset}><RotateCcw size={14}/>リセット</button><button className="exec-apply" type="submit">この条件で表示</button></div>
  {pending&&<p role="status" className="exec-pending">変更した条件はまだ適用されていません。</p>}
 </form>;
}
export function ExecutiveCards({cards,onKpi}:{cards:ExecutiveCard[];onKpi:(id:string)=>void}){
 const icons=[Coins,Users,ListChecks,ChartNoAxesCombined];
 return <section className="exec-cards" aria-label="主要経営指標">{cards.map((card,index)=>{
  const Icon=icons[index],value=card.actual===null?'未設定':card.unit==='%'?percent(card.actual):card.unit==='百万円'?money(card.actual):number(card.actual,0),target=card.target===null?'未設定':card.unit==='%'?percent(card.target):card.unit==='百万円'?money(card.target):number(card.target,0),good=card.change!==null&&(card.direction==='up'?card.change>=0:card.change<=0);
  return <article className="exec-kpi-card" key={card.id}><div className="exec-kpi-top"><span className="exec-kpi-icon"><Icon size={20} aria-hidden="true"/></span><div><h2>{card.kpiId?<button onClick={()=>onKpi(card.kpiId!)}>{card.label}</button>:card.label}</h2><p className="exec-kpi-value summary-value">{value}<small>{card.actual!==null&&card.unit!=='%'?card.unit:''}</small></p></div></div>
   <div className="exec-kpi-comparison"><span className={card.change===null?'':good?'exec-good':'exec-bad'}>{card.change===null?'—':`${card.change>0?'↑':card.change<0?'↓':''} ${card.change>0?'+':''}${percent(card.change)}`}</span><small>{card.changeLabel}</small></div>
   <div className="exec-kpi-plan"><span>目標 {target}{card.target!==null&&card.unit!=='%'?card.unit:''}</span><strong>達成率 {percent(card.achievement)}</strong></div>
   {card.achievement!==null&&<div className="exec-progress" role="progressbar" aria-label={`${card.label}の達成率`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,card.achievement))} aria-valuetext={percent(card.achievement)}><span style={{width:`${Math.max(0,Math.min(100,card.achievement))}%`}}/></div>}
   <p className="exec-card-note">{card.note}</p>
  </article>;
 })}</section>;
}
export function PriorityKpiTable({rows,onDetail}:{rows:ExecutiveKpi[];onDetail:(id:string)=>void}){
 const [query,setQuery]=useState(''),[sort,setSort]=useState('existing'),[page,setPage]=useState(0),[size,setSize]=useState(5);
 const selected=rows.filter(k=>`${k.name} ${k.categoryLabel} ${k.department}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'ja'):sort==='status'?['missed','attention','unset','on_track'].indexOf(a.status)-['missed','attention','unset','on_track'].indexOf(b.status):sort==='achievement'?(a.achievement??-Infinity)-(b.achievement??-Infinity):sort==='updated'?(b.observationUpdatedAt??'').localeCompare(a.observationUpdatedAt??''):0);
 const pages=Math.max(1,Math.ceil(selected.length/size)),current=Math.min(page,pages-1),slice=selected.slice(current*size,(current+1)*size),value=(v:number|null,k:ExecutiveKpi)=>v===null?'未設定':`${number(v,k.unit.includes('%')?1:0)}${k.unit}`;
 return <section className="exec-panel exec-priority" aria-labelledby="exec-priority-title"><header className="exec-table-toolbar"><h2 id="exec-priority-title">重要KPI一覧</h2><label className="exec-table-search"><span className="sr-only">重要KPIを検索</span><input type="search" placeholder="KPI名・カテゴリ・部門で検索" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/></label><label>並べ替え<select aria-label="重要KPIの並べ替え" value={sort} onChange={e=>{setSort(e.target.value);setPage(0)}}><option value="existing">登録順</option><option value="status">未達・要注意を先頭</option><option value="achievement">達成率の低い順</option><option value="name">名称順</option><option value="updated">更新が新しい順</option></select></label></header>
  <p className="exec-table-explanation">重要度は未定義のため初期表示は登録順です。各指標は選択期間内の最新月と、その月の計画で比較します。</p>
  <div className="exec-table-scroll"><table><thead><tr><th>KPI名</th><th>カテゴリ</th><th>部門</th><th>対象月目標</th><th>対象月実績</th><th>達成率</th><th>前月比</th><th>状態</th><th>最終更新日</th><th>操作</th></tr></thead><tbody>{slice.map(k=><tr key={k.id}><th scope="row">{k.name}<small>{k.period??'対象月未設定'}</small></th><td>{k.categoryLabel}</td><td>{k.department}</td><td>{value(k.plan,k)}</td><td>{value(k.actual,k)}</td><td>{percent(k.achievement)}</td><td className={k.priorChange===null?'':(k.direction==='up'?k.priorChange>=0:k.priorChange<=0)?'exec-good':'exec-bad'}>{k.priorChange===null?'—':`${k.priorChange>0?'+':''}${percent(k.priorChange)}`}</td><td><span className={`exec-status exec-state-${k.status}`}>{evaluationLabels[k.status]}</span></td><td>{k.observationUpdatedAt?.slice(0,10)??'未設定'}</td><td><button onClick={()=>onDetail(k.id)} aria-label={`${k.name}のサマリー詳細`}>詳細</button></td></tr>)}</tbody></table>{!slice.length&&<p className="exec-empty">条件に一致するKPIはありません。</p>}</div>
  <footer className="exec-pagination"><span>{selected.length}件中 {selected.length?current*size+1:0}〜{Math.min((current+1)*size,selected.length)}件</span><button disabled={current===0} onClick={()=>setPage(current-1)}>前へ</button><span>{current+1} / {pages}</span><button disabled={current+1>=pages} onClick={()=>setPage(current+1)}>次へ</button><select aria-label="重要KPIの表示件数" value={size} onChange={e=>{setSize(Number(e.target.value));setPage(0)}}>{executiveConfig.pageSizes.map(n=><option key={n} value={n}>{n}件 / ページ</option>)}</select></footer>
 </section>;
}
