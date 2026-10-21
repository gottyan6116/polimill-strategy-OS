"use client";
import {useDialog} from '@/components/use-dialog';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ChevronDown,ChevronRight,MoreHorizontal,ArrowUpRight,Building2,X} from 'lucide-react';
import type {Kpi,Workspace} from '@/lib/model';
import {organizationBranches,treeKpiEvaluation} from '@/lib/organization-tree';
import {organizationTree} from '@/config/organization-tree';
import {evaluationLabels} from '@/config/management';
import {count,percent} from '../finance/format';
import {kpiNumber,type DetailTarget} from './entity-detail';
import type {EditRecord} from '../edit-dialog';

function KpiNode({kpi,data,onClick,onSetup}:{kpi:Kpi;data:Workspace;onClick:()=>void;onSetup:(id:string,period:string)=>void}) {
  const evaluation=treeKpiEvaluation(kpi,data);
  const descriptionId=`org-kpi-description-${kpi.id}`;
  return <article className="org-kpi-node"><button className="org-kpi-main" onClick={onClick} aria-label={`${kpi.name}の詳細`} aria-describedby={descriptionId}>
    <span id={descriptionId} className="sr-only">{evaluationLabels[evaluation.status]}。達成率 {evaluation.achievement===null?'未設定':percent(evaluation.achievement)}。{evaluation.period==='current'?'対象月未登録':evaluation.period}。実績 {kpiNumber(evaluation.actual,kpi)}、計画 {kpiNumber(evaluation.plan,kpi)}。</span>
    <span className="org-kpi-name">{kpi.name}<ArrowUpRight size={15} aria-hidden="true"/></span>
    {evaluation.achievement===null?<span className="org-empty-progress" aria-label="対象月の目標未設定"/>:<>
      <span className={`org-progress-track org-progress-${evaluation.status}`} role="progressbar" aria-label={`${kpi.name}の達成率`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.max(0,evaluation.achievement))} aria-valuetext={`達成率 ${percent(evaluation.achievement)}`}><span style={{width:`${Math.min(100,Math.max(0,evaluation.achievement))}%`}}/></span>
      <span className={`org-kpi-result org-result-${evaluation.status}`}><span>{evaluationLabels[evaluation.status]}</span><strong>達成率 {percent(evaluation.achievement)}</strong></span>
    </>}
    <span className="org-kpi-comparison">{evaluation.period==='current'?'対象月未登録':evaluation.period} ／ 実績 {kpiNumber(evaluation.actual,kpi)} ・ 計画 {kpiNumber(evaluation.plan,kpi)}</span>
  </button>{evaluation.achievement===null&&<button className="secondary-button org-setup-button" aria-label={`${kpi.name}の月別目標を設定`} onClick={()=>onSetup(kpi.id,evaluation.period)}>＋ 目標を設定</button>}</article>;
}
function CompanyDetail({data,onClose:finishClose,onDepartment}:{data:Workspace;onClose:()=>void;onDepartment:(id:string)=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  const onClose=useDialog(ref,finishClose);
  return <dialog ref={ref} className="dialog org-company-detail" aria-labelledby="org-company-detail-title" onCancel={onClose}>
    <header><div><h2 id="org-company-detail-title">{organizationTree.companyGoal?.title??'全社目標は未設定'}</h2><p>全社目標</p></div><button aria-label="閉じる" onClick={onClose}><X size={20} aria-hidden="true"/></button></header>
    {!organizationTree.companyGoal&&<p>全社目標の保存機能は未接続です。以下から登録済みの部門目標を確認・編集できます。</p>}
    <dl><div><dt>組織</dt><dd>{data.organization.name}</dd></div><div><dt>説明</dt><dd>{organizationTree.companyGoal?.description??'全社目標の名称・説明は未登録です。'}</dd></div><div><dt>全社進捗</dt><dd>未設定（正式な集計ルール未登録）</dd></div></dl>
    <h3>部門目標を確認</h3><ul>{organizationBranches(data).map(({department})=><li key={department.id}><button onClick={()=>onClose(()=>onDepartment(department.id))}>{department.name}<ChevronRight size={14} aria-hidden="true"/></button></li>)}</ul>
    {!data.departments.length&&<p>部門データは未設定です。</p>}
  </dialog>;
}
export default function StrategyTree({data,expanded,onToggle,onDetail,onList,onEdit,onSetupKpi}:{data:Workspace;expanded:Record<string,boolean>;onToggle:(id:string)=>void;onDetail:(target:DetailTarget)=>void;onList:()=>void;onEdit:(item:EditRecord)=>void;onSetupKpi:(id:string,period:string)=>void}) {
  const branches=organizationBranches(data);
  const [menu,setMenu]=useState(false),[companyDetail,setCompanyDetail]=useState(false);
  const menuRoot=useRef<HTMLDivElement>(null),menuButton=useRef<HTMLButtonElement>(null);
  const grid=useRef<HTMLDivElement>(null),[singleRow,setSingleRow]=useState(false);
  useLayoutEffect(()=>{const element=grid.current;if(!element)return;const measure=()=>{const nodes=[...element.children] as HTMLElement[];setSingleRow(nodes.length>0&&nodes.every(n=>Math.abs(n.offsetTop-nodes[0].offsetTop)<2))};const observer=new ResizeObserver(measure);observer.observe(element);measure();return()=>observer.disconnect()},[branches.length]);
  useEffect(()=>{if(!menu)return;const close=(event:PointerEvent)=>{if(!menuRoot.current?.contains(event.target as Node))setMenu(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[menu]);
  const closeCompany=()=>setCompanyDetail(false);
  return <>
    <div className="org-tree-viewport" role="region" aria-label="組織・戦略ツリー" tabIndex={0}>
      <div className="org-strategy-tree" data-connected={singleRow}>
        <article className={`org-company-node ${!branches.length?'org-company-empty':''}`}>
          <div className="org-company-top"><span className="org-node-label">全社目標</span><div className="org-company-menu" ref={menuRoot} onKeyDown={e=>{if(e.key==='Escape'){setMenu(false);menuButton.current?.focus()}}}><button ref={menuButton} aria-label="全社目標の詳細メニュー" aria-expanded={menu} aria-controls="org-company-menu" onClick={()=>setMenu(!menu)}><MoreHorizontal size={18}/></button>{menu&&<div id="org-company-menu" className="org-menu-popover"><button onClick={()=>{menuButton.current?.focus();setMenu(false);setCompanyDetail(true)}}>全社目標の登録状況を見る</button><button onClick={()=>{setMenu(false);onList()}}>部門一覧を表示</button></div>}</div></div>
          <p className="org-company-organization">{data.organization.name}</p><h2>{organizationTree.companyGoal?.title??'全社目標は未設定'}</h2><p className="org-company-description">{organizationTree.companyGoal?.description??'部門ごとの目標とKPIを、組織のつながりから確認します。'}</p>
          <div className="org-company-progress"><span>全社進捗</span><span>未設定</span></div>
          {!organizationTree.companyGoal&&<div className="org-company-setup"><p>全社目標を設定すると、部門目標との整合を確認できます。</p><button className="primary-button" onClick={()=>setCompanyDetail(true)}>全社目標を設定</button></div>}
        </article>
        {branches.length?<div className="org-tree-branches" ref={grid} data-single-row={singleRow}>{branches.map(({department,goals,kpiCount})=>{
          const open=expanded[department.id]!==false;
          return <section key={department.id} className={`org-department-column ${open&&goals.length?'org-column-expanded':''}`} aria-label={department.name}>
            <article className="org-department-node" onClick={event=>{event.currentTarget.querySelector<HTMLButtonElement>('.org-department-main')?.focus();onDetail({kind:'department',id:department.id})}}>
              <button className="org-department-toggle" aria-label={`${department.name}のKPIを${open?'折りたたむ':'展開する'}`} aria-expanded={open} aria-controls={`org-children-${department.id}`} onClick={e=>{e.stopPropagation();onToggle(department.id)}}><ChevronDown size={17} aria-hidden="true"/></button>
              <button className="org-department-main" aria-label={`${department.name}の詳細`} onClick={e=>{e.stopPropagation();onDetail({kind:'department',id:department.id})}}>
                <span className="org-department-title"><Building2 size={15} aria-hidden="true"/>{department.name}</span><span className="org-department-mission">{department.mission||'ミッションは未設定です'}</span><span className="org-department-owner"><span className="org-owner-initial" aria-hidden="true">{department.owner?.slice(0,1)||'—'}</span><span>責任者<strong>{department.owner||'未設定'}</strong></span></span>
                <span className="org-department-counts"><span>目標 <strong>{count(goals.length)}</strong></span><span>KPI <strong>{count(kpiCount)}</strong></span></span><span className="org-empty-progress" aria-label="部門進捗の集計ルール未設定"/>
              </button>
              <div className="org-department-footer"><button className="secondary-button org-setup-button" disabled={!goals.length} onClick={e=>{e.stopPropagation();if(goals[0])onEdit({kind:'goals',record:goals[0]})}}>＋ 目標を設定</button>{goals.map(goal=><button className="org-goal-link" key={goal.id} aria-label={`${goal.title}の目標を確認`} onClick={e=>{e.stopPropagation();onDetail({kind:'department',id:department.id})}}>{goal.title}<ChevronRight size={14} aria-hidden="true"/></button>)}</div>
            </article>
            <div className="org-children-collapse" data-expanded={open} aria-hidden={!open} inert={!open} id={`org-children-${department.id}`}><div className="org-children-inner"><div className="org-kpi-list">
              {goals.map(goal=><div className="org-goal-group" key={goal.id}><h3 className="sr-only">{goal.title}</h3>{goal.kpis.map(kpi=><KpiNode key={kpi.id} kpi={kpi} data={data} onSetup={onSetupKpi} onClick={()=>onDetail({kind:'kpi',id:kpi.id})}/>)}{!goal.kpis.length&&<p className="org-branch-empty">この目標のKPIは未設定です。</p>}</div>)}
              {!goals.length&&<p className="org-branch-empty">部門目標は未設定です。</p>}
            </div></div></div>
          </section>;
        })}</div>:<p className="org-empty-tree">部門データは未設定です。一覧表示から登録状況を確認できます。</p>}
      </div>
    </div>
    {companyDetail&&<CompanyDetail data={data} onClose={closeCompany} onDepartment={id=>{setCompanyDetail(false);onDetail({kind:'department',id})}}/>}
  </>;
}
