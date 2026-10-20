import type {Workspace} from './model';
import {calculateFinance,consolidateFinance,financeFieldsSchema,type FinanceFields,type FinanceWorkspace} from './finance';
import {kpiEvaluation,milestoneProgress} from './management';
import {getKpiConfig} from '../config/management';
import {invoiceBalance,japanDate,monthFieldsSchema} from './operations';
export const latestKpiPeriod=(data:Pick<Workspace,'history'>,id:string)=>data.history.filter(h=>h.kpi_id===id).map(h=>h.month).sort().at(-1)??'current';
export function scenarioSummary(data:FinanceWorkspace,year:number,scenario:'actual'|'budget'|'forecast'|'prior_year'){
 const records=data.records.filter(r=>r.fiscal_year===year);
 if(!records.length)return {revenue:null,operatingProfit:null,cash:null};
 if(scenario==='actual'){const m=consolidateFinance(records);return {revenue:m.revenue,operatingProfit:m.operatingProfit,cash:m.closingCash};}
 const points=data.management?.values??[];
 const result=(keys:(keyof FinanceFields)[],metric:'revenue'|'operatingProfit'|'closingCash')=>{
  const values=records.map(r=>{
   const overrides:Partial<FinanceFields>={};
   for(const key of keys){const point=points.find(p=>p.entity_type==='finance_period'&&p.entity_id===r.id&&p.metric===key&&p.period===String(year)&&p.scenario===scenario);const previous=scenario==='prior_year'?data.records.find(p=>p.business_unit_id===r.business_unit_id&&p.fiscal_year===year-1):null;const value=point?point.value:previous?.[key]??null;if(value==null)return null;overrides[key]=value;}
   return calculateFinance({...r,...overrides})[metric];
  });
  return values.some(v=>v===null)?null:values.reduce<number>((n,v)=>n+(v??0),0);
 };
 return {revenue:result(['revenue'],'revenue'),operatingProfit:result(['revenue','cost_of_sales','sga'],'operatingProfit'),cash:result(['opening_cash','operating_cf','investing_cf','financing_cf'],'closingCash')};
}
export function reportingFreshness(data:FinanceWorkspace,year:number){
 const records=data.records.filter(r=>r.fiscal_year===year),ids=new Set(records.map(r=>r.id)),months=data.months.filter(m=>ids.has(m.finance_period_id)),monthIds=new Set(months.map(m=>m.id));
 const points=(data.management?.values??[]).filter(p=>(p.entity_type==='finance_period'&&ids.has(p.entity_id))||(p.entity_type==='finance_month'&&monthIds.has(p.entity_id)));
 const actual=points.filter(p=>p.scenario==='actual');
 const closedMonths:string[]=[];
 for(let index=0;index<12;index++){const period=`${year+(index>8?1:0)}-${String((index+3)%12+1).padStart(2,'0')}`;const selected=months.filter(m=>m.month_index===index);const complete=selected.length===records.length&&records.length>0&&selected.every(m=>Object.keys(monthFieldsSchema.shape).every(metric=>actual.some(p=>p.entity_id===m.id&&p.metric===metric&&p.is_closed)));if(complete)closedMonths.push(period);}
 let closedThrough:string|null=null;for(let index=0;index<12;index++){const period=`${year+(index>8?1:0)}-${String((index+3)%12+1).padStart(2,'0')}`;if(!closedMonths.includes(period))break;closedThrough=period;}
 const annualClosed=records.length>0&&records.every(r=>Object.keys(financeFieldsSchema.shape).every(metric=>actual.some(p=>p.entity_type==='finance_period'&&p.entity_id===r.id&&p.metric===metric&&p.is_closed)));
 return {annualClosed,closedMonths,closedThrough,latest:points.map(p=>p.updated_at).sort().at(-1)??null,sources:[...new Set(actual.map(p=>p.source))]};
}
export type ExceptionRow={id:string;kind:'kpi'|'initiative'|'receivable'|'payable';name:string;detail:string;amount:number|null;owner:string;severity:'missed'|'attention';entityId:string};
export function exceptionRows(workspace:Workspace,finance:FinanceWorkspace|null,asOf=japanDate()):ExceptionRow[]{
 const result:ExceptionRow[]=[];
 for(const k of workspace.kpis){const period=latestKpiPeriod(workspace,k.id),actual=workspace.history.find(h=>h.kpi_id===k.id&&h.month===period)?.value??null;const evaluation=kpiEvaluation({...k,actual},getKpiConfig(k,workspace.management?.values),period);if(evaluation.status==='missed')result.push({id:k.id,entityId:k.id,kind:'kpi',name:k.name,detail:`${period} 計画に対して未達（実績 ${actual}${k.unit} / 計画 ${evaluation.plan}${k.unit}）`,amount:null,owner:getKpiConfig(k,workspace.management?.values).owner??'未設定',severity:'missed'});}
 for(const i of workspace.initiatives){const milestones=workspace.management?.milestones.filter(m=>m.initiative_id===i.id)??[];const late=milestones.filter(m=>!m.completed_on&&m.planned_on<asOf);if(late.length||(i.due_date<asOf&&i.status!=='done'&&milestoneProgress(milestones)!==100))result.push({id:i.id,entityId:i.id,kind:'initiative',name:i.title,detail:late.length?`遅延マイルストーン ${late.length}件`:`期限 ${i.due_date}`,amount:null,owner:i.owner,severity:'missed'});}
 if(finance)for(const i of finance.invoices){if(i.issued_on>asOf||!i.due_on||i.due_on>=asOf)continue;const balance=invoiceBalance(i,finance.settlements,asOf);if(balance>0)result.push({id:i.id,entityId:i.id,kind:i.kind,name:i.counterparty,detail:`${i.kind==='receivable'?'売掛金':'買掛金'} / 期日 ${i.due_on}`,amount:balance,owner:i.owner??'未設定',severity:'missed'});}
 return result;
}
