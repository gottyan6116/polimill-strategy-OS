import type {Workspace,Kpi} from './model';
import type {FinanceWorkspace} from './finance';
import {getKpiConfig,managementConfig} from '../config/management';
import {executiveConfig} from '../config/executive';
import {kpiEvaluation,comparison} from './management';
import {scenarioSummary} from './reporting';
import {fiscalYearOf,monthlyTotals,monthFieldsSchema,type MonthFields} from './operations';
export type ExecutiveFilters={period:string;organization:string;department:string;category:string;status:string};
export const defaultExecutiveFilters:ExecutiveFilters={period:`FY:${managementConfig.fiscalYear}`,organization:'',department:'',category:'',status:''};
export type TrendPoint={period:string;actual:number|null;target:number|null};
export type ExecutiveCard={id:string;label:string;actual:number|null;target:number|null;achievement:number|null;change:number|null;changeLabel:string;unit:string;note:string;direction:'up'|'down';kpiId?:string};
const sumComplete=(values:(number|null)[])=>!values.length||values.some(v=>v===null)?null:values.reduce<number>((sum,v)=>sum+v!,0);
const monthOf=(year:number,index:number)=>`${year+(index>8?1:0)}-${String((index+3)%12+1).padStart(2,'0')}`;
const previousMonth=(month:string)=>{const [year,m]=month.split('-').map(Number);return `${m===1?year-1:year}-${String(m===1?12:m-1).padStart(2,'0')}`};
export function executivePeriods(data:Workspace,finance:FinanceWorkspace){
 const years=[...new Set([...finance.records.map(r=>r.fiscal_year),...data.history.map(h=>fiscalYearOf(h.month+'-01'))])].sort((a,b)=>b-a);
 const months=[...new Set([...data.history.map(h=>h.month),...finance.months.flatMap(m=>{const p=finance.records.find(r=>r.id===m.finance_period_id);return p?[monthOf(p.fiscal_year,m.month_index)]:[]})])].sort().reverse();
 return [...years.map(y=>({value:`FY:${y}`,label:`${y}年度（4月〜翌3月）`})),...months.map(m=>({value:`M:${m}`,label:m.replace('-','年')+'月'}))];
}
export function executiveRange(period:string){const annual=period.startsWith('FY:'),year=annual?Number(period.slice(3)):fiscalYearOf(period.slice(2)+'-01');return {annual,year,start:annual?`${year}-04`:period.slice(2),end:annual?`${year+1}-03`:period.slice(2)};}
export function groupTrend(rows:TrendPoint[],grain:'month'|'quarter'|'year'):TrendPoint[]{
 const groups=new Map<string,TrendPoint[]>();for(const row of rows){const year=fiscalYearOf(row.period+'-01'),m=Number(row.period.slice(5)),quarter=Math.floor(((m+8)%12)/3)+1,key=grain==='month'?row.period:grain==='quarter'?`${year}年度 Q${quarter}`:`${year}年度`;groups.set(key,[...(groups.get(key)??[]),row]);}
 return [...groups].map(([period,points])=>({period:grain!=='month'&&points.length<(grain==='quarter'?3:12)?`${period}（選択${points.length}か月）`:period,actual:sumComplete(points.map(p=>p.actual)),target:sumComplete(points.map(p=>p.target))}));
}
export function executiveModel(data:Workspace,finance:FinanceWorkspace,filters:ExecutiveFilters){
 const range=executiveRange(filters.period),inRange=(period:string)=>period>=range.start&&period<=range.end;
 const validOrg=!filters.organization||filters.organization===data.organization.id;
 const goalMap=new Map(data.goals.map(g=>[g.id,g]));
 const rows=data.kpis.map(kpi=>{
  const config=getKpiConfig(kpi,data.management?.values),goal=goalMap.get(kpi.goal_id),department=data.departments.find(d=>d.id===goal?.department_id),category=executiveConfig.categoryByKpi[kpi.id]??'__unset';
  const period=data.history.filter(h=>h.kpi_id===kpi.id&&inRange(h.month)).map(h=>h.month).sort().at(-1)??null;
  const actual=period?data.history.find(h=>h.kpi_id===kpi.id&&h.month===period)?.value??null:null;
  const evaluation=kpiEvaluation({...kpi,actual},config,period??'unavailable');
  const prior=period?data.history.find(h=>h.kpi_id===kpi.id&&h.month===previousMonth(period))?.value??null:null;
  const observationUpdatedAt=period?data.management?.values.find(p=>p.entity_type==='kpi'&&p.entity_id===kpi.id&&p.metric==='actual'&&p.scenario==='actual'&&p.period===period)?.updated_at??null:null;
  return {...kpi,actual,period,observationUpdatedAt,departmentId:department?.id??'',department:department?.name??'未設定',category,categoryLabel:executiveConfig.categoryLabels[category]??'未設定',...evaluation,priorChange:comparison(actual,null,prior).priorPercent,direction:config.direction??kpi.direction};
 }).filter(row=>validOrg&&(!filters.department||row.departmentId===filters.department)&&(!filters.category||row.category===filters.category)&&(!filters.status||row.status===filters.status));
 const unitIds=filters.department?executiveConfig.departmentBusinessUnits[filters.department]:null;
 const financialAvailable=validOrg&&!filters.category&&!filters.status&&(!filters.department||!!unitIds?.length);
 const units=finance.units.filter(u=>!unitIds||unitIds.includes(u.id));
 const records=finance.records.filter(r=>units.some(u=>u.id===r.business_unit_id));
 const scopedFinance={...finance,units,records,months:finance.months.filter(m=>records.some(r=>r.id===m.finance_period_id))};
 const financialNote=financialAvailable?'仮実績・未締め情報を含む':'選択したKPI条件と財務データの紐づけは未設定です';
 function monthsFor(year:number,month?:string,unit?:string){return scopedFinance.months.filter(m=>{const p=records.find(r=>r.id===m.finance_period_id);return p&&p.fiscal_year===year&&(!unit||p.business_unit_id===unit)&&(!month||monthOf(year,m.month_index)===month)});}
 function monthValue(month:string,scenario:'actual'|'budget',metric:'revenue'|'profit',unit?:string):number|null{
  if(!financialAvailable)return null;
  const year=fiscalYearOf(month+'-01'),expected=records.filter(r=>r.fiscal_year===year&&(!unit||r.business_unit_id===unit)),selected=monthsFor(year,month,unit);
  if(!expected.length||selected.length!==expected.length)return null;
  if(scenario==='actual'){const totals=monthlyTotals(selected);return metric==='revenue'?totals.revenue:totals.operatingProfit;}
  const keys=metric==='revenue'?['revenue'] as const:Object.keys(monthFieldsSchema.shape) as (keyof MonthFields)[];
  const values=selected.map(m=>{const fields:Partial<MonthFields>={};for(const key of keys){const value=finance.management?.values.find(p=>p.entity_type==='finance_month'&&p.entity_id===m.id&&p.metric===key&&p.scenario==='budget'&&p.period===month)?.value??null;if(value===null)return null;fields[key]=value;}return metric==='revenue'?fields.revenue!:monthlyTotals([fields as MonthFields]).operatingProfit;});
  return sumComplete(values);
 }
 function periodValue(scenario:'actual'|'budget'|'prior_year',metric:'revenue'|'operatingProfit',unit?:string){
  if(!financialAvailable)return null;
  if(!range.annual){const month=scenario==='prior_year'?previousMonth(range.start):range.start;return monthValue(month,scenario==='prior_year'?'actual':scenario,metric==='revenue'?'revenue':'profit',unit);}
  const scoped={...scopedFinance,records:records.filter(r=>!unit||r.business_unit_id===unit)};return scenarioSummary(scoped,range.year,scenario)[metric];
 }
 const revenue=periodValue('actual','revenue'),profit=periodValue('actual','operatingProfit'),budgetRevenue=periodValue('budget','revenue'),budgetProfit=periodValue('budget','operatingProfit'),priorRevenue=periodValue('prior_year','revenue'),priorProfit=periodValue('prior_year','operatingProfit');
 const margin=revenue!==null&&profit!==null&&revenue>0?profit/revenue*100:null,budgetMargin=budgetRevenue!==null&&budgetProfit!==null&&budgetRevenue>0?budgetProfit/budgetRevenue*100:null,priorMargin=priorRevenue!==null&&priorProfit!==null&&priorRevenue>0?priorProfit/priorRevenue*100:null;
 const primary=rows.find(r=>r.id===executiveConfig.primaryKpiId);
 const initiativeIds=new Set(data.initiatives.filter(i=>{const goal=goalMap.get(i.goal_id);const allowedGoals=rows.map(r=>r.goal_id);return validOrg&&(!filters.department||goal?.department_id===filters.department)&&((!filters.category&&!filters.status)||allowedGoals.includes(i.goal_id));}).map(i=>i.id));
 const milestones=(data.management?.milestones??[]).filter(m=>initiativeIds.has(m.initiative_id)&&inRange(m.planned_on.slice(0,7))),completed=milestones.filter(m=>m.completed_on&&inRange(m.completed_on.slice(0,7))).length;
 const achievement=(value:number|null,target:number|null)=>value===null||target===null||target<=0?null:value/target*100;
 const cards:ExecutiveCard[]=[
  {id:'revenue',label:'売上高',actual:revenue,target:budgetRevenue,achievement:achievement(revenue,budgetRevenue),change:comparison(revenue,null,priorRevenue).priorPercent,changeLabel:range.annual?'前年比':'前月比',unit:'百万円',note:range.annual?`${range.year}年度・通期`:range.start,direction:'up'},
  {id:'partners',label:primary?.name??data.kpis.find(k=>k.id===executiveConfig.primaryKpiId)?.name??'主要KPI',actual:primary?.actual??null,target:primary?.plan??null,achievement:primary?.achievement??null,change:primary?.priorChange??null,changeLabel:'前月比',unit:primary?.unit??'',note:primary?.period?`${primary.period} の月別計画比較`:'対象月実績は未設定',direction:primary?.direction??'up',kpiId:primary?.id},
  {id:'milestones',label:'完了マイルストーン数',actual:milestones.length?completed:null,target:milestones.length||null,achievement:milestones.length?completed/milestones.length*100:null,change:null,changeLabel:'前期比',unit:'件',note:'選択期間に予定された工程のうち期間内に完了',direction:'up'},
  {id:'margin',label:'営業利益率',actual:margin,target:budgetMargin,achievement:achievement(margin,budgetMargin),change:comparison(margin,null,priorMargin).priorPercent,changeLabel:range.annual?'前年比':'前月比',unit:'%',note:'営業利益 ÷ 売上高（予算も同じ定義）',direction:'up'},
 ];
 const trendMonths=range.annual?Array.from({length:12},(_,i)=>monthOf(range.year,i)):[range.start];
 const trend:TrendPoint[]=trendMonths.map(period=>({period,actual:monthValue(period,'actual','revenue'),target:monthValue(period,'budget','revenue')}));
 const states=executiveConfig.statuses.map(status=>({key:status,count:rows.filter(r=>r.status===status).length}));
 const departments=data.departments.filter(d=>!filters.department||d.id===filters.department).filter(()=>validOrg).sort((a,b)=>{const rank=(id:string)=>{const index=executiveConfig.departmentOrder.indexOf(id);return index<0?100:index};return rank(a.id)-rank(b.id)}).map(d=>({id:d.id,label:d.name,counts:executiveConfig.statuses.map(s=>rows.filter(r=>r.departmentId===d.id&&r.status===s).length)}));
 const categories=[...new Set(rows.map(r=>r.category))].map(category=>({id:category,label:executiveConfig.categoryLabels[category]??'未設定',counts:executiveConfig.statuses.map(s=>rows.filter(r=>r.category===category&&r.status===s).length)}));
 const annual=financialAvailable?[...new Set(records.map(r=>r.fiscal_year))].filter(y=>y<=range.year).sort().slice(-4).map(year=>{const value=scenarioSummary(scopedFinance,year,'actual');return {period:`${year}年度`,actual:value.revenue,target:value.operatingProfit};}):[];
 const compositionValues=financialAvailable?units.map(u=>({id:u.id,label:u.name,value:periodValue('actual','revenue',u.id)})):[];
 const composition=compositionValues.every(u=>u.value!==null)?compositionValues as {id:string;label:string;value:number}[]:[];
 return {range,cards,kpis:rows,trend,states,departments,categories,annual,composition,financialAvailable,financialNote,scopedFinance};
}
export type ExecutiveModel=ReturnType<typeof executiveModel>;
export type ExecutiveKpi=ExecutiveModel['kpis'][number];
