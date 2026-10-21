"use client";
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,ChevronRight,MoreHorizontal,ArrowUpRight,Building2} from 'lucide-react';
import type {Kpi,Workspace} from '@/lib/model';
import {organizationBranches,treeKpiEvaluation} from '@/lib/organization-tree';
import {organizationTree} from '@/config/organization-tree';
import {evaluationLabels} from '@/config/management';
import {count,percent} from '../finance/format';
import {kpiNumber,type DetailTarget} from './entity-detail';

function KpiNode({kpi,data,onClick}:{kpi:Kpi;data:Workspace;onClick:()=>void}) {
  const evaluation=treeKpiEvaluation(kpi,data);
  const descriptionId=`org-kpi-description-${kpi.id}`;
  return <button className="org-kpi-node" onClick={onClick} aria-label={`${kpi.name}の詳細`} aria-describedby={descriptionId}>
    <span id={descriptionId} className="sr-only">{evaluationLabels[evaluation.status]}。達成率 {evaluation.achievement===null?'未設定':percent(evaluation.achievement)}。{evaluation.period==='current'?'対象月未登録':evaluation.period}。実績 {kpiNumber(evaluation.actual,kpi)}、計画 {kpiNumber(evaluation.plan,kpi)}。</span>
    <span className="org-kpi-name">{kpi.name}<ArrowUpRight size={15} aria-hidden="true"/></span>
    {evaluation.achievement===null?<span className="org-kpi-unset">達成率 未設定<span>対象月の計画・実績を登録してください</span></span>:<>
      <span className={`org-progress-track org-progress-${evaluation.status}`} role="progressbar" aria-label={`${kpi.name}の達成率`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.max(0,evaluation.achievement))} aria-valuetext={`達成率 ${percent(evaluation.achievement)}`}><span style={{width:`${Math.min(100,Math.max(0,evaluation.achievement))}%`}}/></span>
      <span className={`org-kpi-result org-result-${evaluation.status}`}><span>{evaluationLabels[evaluation.status]}</span><strong>達成率 {percent(evaluation.achievement)}</strong></span>
    </>}
    <span className="org-kpi-comparison">{evaluation.period==='current'?'対象月未登録':evaluation.period} ／ 実績 {kpiNumber(evaluation.actual,kpi)} ・ 計画 {kpiNumber(evaluation.plan,kpi)}</span>
  </button>;
}
function CompanyDetail({data,onClose,onDepartment}:{data:Workspace;onClose:()=>void;onDepartment:(id:string)=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal()},[]);
  return <dialog ref={ref} className="org-company-detail" aria-labelledby="org-company-detail-title" onCancel={onClose}>
    <header><div><p>全社目標</p><h2 id="org-company-detail-title">{organizationTree.companyGoal?.title??'全社目標は未設定'}</h2></div><button onClick={onClose}>閉じる</button></header>
    <dl><div><dt>組織</dt><dd>{data.organization.name}</dd></div><div><dt>説明</dt><dd>{organizationTree.companyGoal?.description??'全社目標の名称・説明は未登録です。'}</dd></div><div><dt>全社進捗</dt><dd>未設定（正式な集計ルール未登録）</dd></div></dl>
    <h3>部門目標を確認</h3><ul>{organizationBranches(data).map(({department})=><li key={department.id}><button onClick={()=>onDepartment(department.id)}>{department.name}<ChevronRight size={14} aria-hidden="true"/></button></li>)}</ul>
    {!data.departments.length&&<p>部門データは未設定です。</p>}
  </dialog>;
}
export default function StrategyTree({data,expanded,onToggle,onDetail,onList}:{data:Workspace;expanded:Record<string,boolean>;onToggle:(id:string)=>void;onDetail:(target:DetailTarget)=>void;onList:()=>void}) {
  const branches=organizationBranches(data);
  const [menu,setMenu]=useState(false),[companyDetail,setCompanyDetail]=useState(false);
  const menuRoot=useRef<HTMLDivElement>(null),menuButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!menu)return;const close=(event:PointerEvent)=>{if(!menuRoot.current?.contains(event.target as Node))setMenu(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[menu]);
  const closeCompany=()=>{setCompanyDetail(false);menuButton.current?.focus()};
  return <>
    <div className="org-tree-viewport" role="region" aria-label="組織・戦略ツリー" tabIndex={0}>
      <div className="org-strategy-tree">
        <article className={`org-company-node ${!branches.length?'org-company-empty':''}`}>
          <div className="org-company-top"><span className="org-node-label">全社目標</span><div className="org-company-menu" ref={menuRoot} onKeyDown={e=>{if(e.key==='Escape'){setMenu(false);menuButton.current?.focus()}}}><button ref={menuButton} aria-label="全社目標の詳細メニュー" aria-expanded={menu} aria-controls="org-company-menu" onClick={()=>setMenu(!menu)}><MoreHorizontal size={18}/></button>{menu&&<div id="org-company-menu" className="org-menu-popover"><button onClick={()=>{setMenu(false);setCompanyDetail(true)}}>全社目標の登録状況を見る</button><button onClick={()=>{setMenu(false);onList()}}>部門一覧を表示</button></div>}</div></div>
          <p className="org-company-organization">{data.organization.name}</p><h2>{organizationTree.companyGoal?.title??'全社目標は未設定'}</h2><p className="org-company-description">{organizationTree.companyGoal?.description??'部門ごとの目標とKPIを、組織のつながりから確認します。'}</p>
          <div className="org-company-progress"><span>全社進捗</span><span>未設定</span></div>
        </article>
        {branches.length?<div className="org-tree-branches">{branches.map(({department,goals,kpiCount})=>{
          const open=expanded[department.id]!==false;
          return <section key={department.id} className={`org-department-column ${open&&goals.length?'org-column-expanded':''}`} aria-label={department.name}>
            <article className="org-department-node">
              <button className="org-department-toggle" aria-label={`${department.name}のKPIを${open?'折りたたむ':'展開する'}`} aria-expanded={open} aria-controls={`org-children-${department.id}`} onClick={()=>onToggle(department.id)}><ChevronDown size={17} aria-hidden="true"/></button>
              <button className="org-department-main" aria-label={`${department.name}の詳細`} onClick={()=>onDetail({kind:'department',id:department.id})}>
                <span className="org-department-title"><Building2 size={15} aria-hidden="true"/>{department.name}</span><span className="org-department-mission">{department.mission||'ミッションは未設定です'}</span><span className="org-department-owner"><span className="org-owner-initial" aria-hidden="true">{department.owner?.slice(0,1)||'—'}</span><span>責任者<strong>{department.owner||'未設定'}</strong></span></span>
                <span className="org-department-counts"><span>目標 <strong>{count(goals.length)}</strong></span><span>KPI <strong>{count(kpiCount)}</strong></span></span><span className="org-department-progress"><span>部門進捗</span><strong>未設定</strong></span>
              </button>
            </article>
            <div className="org-children-collapse" data-expanded={open} aria-hidden={!open} inert={!open} id={`org-children-${department.id}`}><div className="org-children-inner"><div className="org-kpi-list">
              {goals.map(goal=><div className="org-goal-group" key={goal.id}><button className="org-goal-link" onClick={()=>onDetail({kind:'department',id:department.id})} aria-label={`${goal.title}の目標を確認`}><span>部門目標</span>{goal.title}<ChevronRight size={13} aria-hidden="true"/></button>{goal.kpis.map(kpi=><KpiNode key={kpi.id} kpi={kpi} data={data} onClick={()=>onDetail({kind:'kpi',id:kpi.id})}/>)}{!goal.kpis.length&&<p className="org-branch-empty">この目標のKPIは未設定です。</p>}</div>)}
              {!goals.length&&<p className="org-branch-empty">部門目標は未設定です。</p>}
            </div></div></div>
          </section>;
        })}</div>:<p className="org-empty-tree">部門データは未設定です。一覧表示から登録状況を確認できます。</p>}
      </div>
    </div>
    {companyDetail&&<CompanyDetail data={data} onClose={closeCompany} onDepartment={id=>{setCompanyDetail(false);onDetail({kind:'department',id})}}/>}
  </>;
}
