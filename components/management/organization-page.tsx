"use client";
import {useEffect,useState} from 'react';
import {List,Network} from 'lucide-react';
import type {Workspace} from '@/lib/model';
import {organizationSummary} from '@/lib/organization-tree';
import {organizationTree} from '@/config/organization-tree';
import type {EditRecord} from '../edit-dialog';
import {count} from '../finance/format';
import EntityPages from './entity-pages';
import EntityDetail,{type DetailTarget} from './entity-detail';
import StrategyTree from './strategy-tree';
import './organization.css';

export function OrganizationSummary({data}:{data:Workspace}) {
  const summary=organizationSummary(data);
  return <dl className="org-summary" aria-label="組織・部門の概要">
    {[
      {label:'部門数',value:summary.departments,note:'登録されている部門数'},
      {label:'目標数',value:summary.goals,note:'部門目標の登録数'},
      {label:'進行中施策',value:summary.activeInitiatives,note:'実行中の状態の施策数'},
      {label:'未設定',value:summary.unsetKpis,note:organizationTree.unsetSummaryDescription},
    ].map(item=><div key={item.label} title={item.note}><dt>{item.label}</dt><dd>{count(item.value)}</dd></div>)}
  </dl>;
}
type Props={data:Workspace;onEdit:(item:EditRecord)=>void;onSaved:()=>Promise<void>;onFinance:()=>void;initialDetail?:DetailTarget|null};
export default function OrganizationGoalPage({data,onEdit,onSaved,onFinance,initialDetail}:Props) {
  const [view,setView]=useState<'tree'|'list'>('tree');
  const [detail,setDetail]=useState<DetailTarget|null>(initialDetail??null);
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  useEffect(()=>{setDetail(initialDetail??null)},[initialDetail]);
  const allExpanded=data.departments.every(d=>expanded[d.id]!==false);
  const setAll=(open:boolean)=>setExpanded(Object.fromEntries(data.departments.map(d=>[d.id,open])));
  return <section className="org-goal-page" aria-label="組織と戦略の関係">
    <div className="org-view-toolbar">
      <div className="org-view-switch" role="group" aria-label="組織の表示モード">
        <button aria-pressed={view==='tree'} onClick={()=>setView('tree')}><Network size={15} aria-hidden="true"/>ツリー表示</button>
        <button aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={15} aria-hidden="true"/>一覧表示</button>
      </div>
      {view==='tree'&&<div className="org-tree-controls"><span>部門を選択して目標を確認</span><button onClick={()=>setAll(!allExpanded)}>{allExpanded?'すべて折りたたむ':'すべて展開する'}</button></div>}
    </div>
    <div hidden={view!=='tree'} className="org-tree-view">
      <StrategyTree data={data} expanded={expanded} onToggle={id=>setExpanded(current=>({...current,[id]:current[id]===false}))} onDetail={setDetail} onList={()=>setView('list')}/>
      <p className="org-tree-note">仮データを表示しています。全社・部門の進捗は正式な集計ルールが未登録のため未設定です。KPIは対象月の計画と実績から判定し、下位指標の単純平均は行いません。</p>
    </div>
    <div hidden={view!=='list'} className="org-list-view"><EntityPages kind="organization" data={data} onEdit={onEdit} onSaved={onSaved} onFinance={onFinance}/></div>
    {detail&&<EntityDetail target={detail} data={data} onClose={()=>setDetail(null)} onEdit={onEdit} onSaved={onSaved} onFinance={onFinance} onNavigate={setDetail}/>}
  </section>;
}
