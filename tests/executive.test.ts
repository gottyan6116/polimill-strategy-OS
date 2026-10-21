import {test} from 'node:test';
import assert from 'node:assert/strict';
import {executiveModel,executivePeriods,defaultExecutiveFilters,groupTrend} from '../lib/executive.ts';
import type {Workspace} from '../lib/model';
import type {FinanceWorkspace} from '../lib/finance';
const data:Workspace={organization:{id:'o',name:'仮組織'},user:{name:'仮',email:'demo@example.invalid'},departments:[{id:'d',name:'部門',owner:'仮',mission:''}],goals:[{id:'g',department_id:'d',owner:'仮',title:'目標',hypothesis:'',version:1}],kpis:[{id:'kpi-partners',goal_id:'g',name:'自治体数',unit:'件',actual:999,target:999,direction:'up',version:1}],history:[{kpi_id:'kpi-partners',month:'2026-09',value:10},{kpi_id:'kpi-partners',month:'2026-10',value:15}],initiatives:[{id:'i',goal_id:'g',title:'施策',owner:'仮',due_date:'2026-12-01',status:'active',progress:99,version:1}],management:{values:[],milestones:[{id:'m',initiative_id:'i',title:'工程',planned_on:'2026-10-10',completed_on:'2026-10-12',version:1}]}};
const finance:FinanceWorkspace={units:[{id:'u',name:'事業',color:'#000'}],records:[{id:'p',business_unit_id:'u',fiscal_year:2026,revenue:100,cost_of_sales:20,sga:30,tax_rate:.3,opening_invested_capital:0,opening_assets:0,opening_cash:0,receivables:0,inventory:0,payables:0,fixed_assets:0,short_term_debt:0,long_term_debt:0,operating_cf:0,investing_cf:0,financing_cf:0,version:1}],months:[{id:'m1',finance_period_id:'p',month_index:6,revenue:7,cost_of_sales:2,sga_people:1,sga_cloud:0,sga_marketing:0,sga_rent:0,sga_travel:0,sga_other:0,version:1}],invoices:[],settlements:[],management:{values:[],milestones:[]}};
test('executive snapshots use selected latest dated observation and existing monthly plan, never annual target',()=>{
 const f={...defaultExecutiveFilters,period:'FY:2026'};const result=executiveModel(data,finance,f);assert.equal(result.kpis[0].actual,15);assert.equal(result.kpis[0].achievement,null);assert.equal(result.kpis[0].priorChange,50);assert.equal(result.cards[0].actual,100);assert.equal(result.cards[1].actual,15);
 const planned=structuredClone(data);planned.management!.values.push({entity_type:'kpi',entity_id:'kpi-partners',metric:'actual',scenario:'budget',period:'2026-10',value:20,is_closed:false,source:'test',updated_at:'2026-10-20',version:1});assert.equal(executiveModel(planned,finance,f).kpis[0].achievement,75);
 planned.kpis[0].direction='down';assert.equal(executiveModel(planned,finance,f).kpis[0].achievement,20/15*100);
 assert.equal(executiveModel(data,finance,{...f,period:'M:2026-09'}).kpis[0].actual,10);assert.equal(executiveModel(data,finance,{...f,period:'M:2026-08'}).kpis[0].actual,null);
});
test('department/category/status scopes never silently retain unrelated corporate revenue',()=>{
 const f={...defaultExecutiveFilters,period:'FY:2026'};for(const scope of [{department:'d'},{category:'__unset'},{status:'unset'}]){const result=executiveModel(data,finance,{...f,...scope});assert.equal(result.cards[0].actual,null);assert.equal(result.composition.length,0);assert.equal(result.kpis.length,1);}
 assert.equal(executiveModel(data,finance,{...f,status:'on_track'}).kpis.length,0);assert.equal(executiveModel(data,finance,{...f,organization:'unknown'}).kpis.length,0);
});
test('financial monthly actuals and annuals remain distinct and missing targets are not zeros',()=>{
 const model=executiveModel(data,finance,{...defaultExecutiveFilters,period:'M:2026-10'});assert.equal(model.cards[0].actual,7);assert.equal(model.cards[0].target,null);assert.equal(model.cards[3].actual,4/7*100);assert.equal(model.trend[0].actual,7);assert.equal(model.trend[0].target,null);assert.equal(model.composition[0].value,7);
 assert.ok(executivePeriods(data,finance).some(p=>p.value==='M:2026-10'));assert.equal(finance.records[0].revenue,100);
});
test('completion counts same planned cohort with actual dated completions; missing data stays empty',()=>{
 const result=executiveModel(data,finance,{...defaultExecutiveFilters,period:'M:2026-10'});assert.equal(result.cards[2].actual,1);assert.equal(result.cards[2].target,1);
 const late=structuredClone(data);late.management!.milestones[0].completed_on='2026-11-01';assert.equal(executiveModel(late,finance,{...defaultExecutiveFilters,period:'M:2026-10'}).cards[2].actual,0);
 const empty=executiveModel({...data,kpis:[],departments:[],goals:[],initiatives:[],history:[],management:{values:[],milestones:[]}},{...finance,records:[],months:[]},defaultExecutiveFilters);assert.equal(empty.cards[0].actual,null);assert.equal(empty.cards[2].target,null);assert.equal(empty.kpis.length,0);
});
test('grouping does not turn partial targets into a complete quarterly target',()=>{
 const rows=[{period:'2026-04',actual:1,target:2},{period:'2026-05',actual:2,target:null},{period:'2026-06',actual:3,target:4}];const quarter=groupTrend(rows,'quarter');assert.equal(quarter[0].actual,6);assert.equal(quarter[0].target,null);assert.equal(quarter[0].period,'2026年度 Q1');
});
test('composition refuses a partial business total and snapshots do not use an undated update timestamp',()=>{
 const missing=structuredClone(finance);missing.units.push({id:'u2',name:'事業2',color:'#999'});missing.records.push({...missing.records[0],id:'p2',business_unit_id:'u2'});
 const model=executiveModel(data,missing,{...defaultExecutiveFilters,period:'M:2026-10'});assert.equal(model.cards[0].actual,null);assert.equal(model.composition.length,0);assert.equal(model.kpis[0].observationUpdatedAt,null);
 const dated=structuredClone(data);dated.management!.values.push({entity_type:'kpi',entity_id:'kpi-partners',metric:'actual',scenario:'actual',period:'2026-09',value:10,is_closed:false,source:'test',updated_at:'2026-10-01',version:1});assert.equal(executiveModel(dated,finance,{...defaultExecutiveFilters,period:'M:2026-09'}).kpis[0].observationUpdatedAt,'2026-10-01');
});
