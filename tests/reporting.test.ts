import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scenarioSummary,latestKpiPeriod,exceptionRows,reportingFreshness} from '../lib/reporting.ts';
import type {FinanceWorkspace} from '../lib/finance.ts';
import {financeFieldsSchema} from '../lib/finance.ts';
import {getKpiConfig,kpiConfig} from '../config/management.ts';
const finance={units:[{id:'u',name:'事業',color:'#000'}],records:[{id:'p',business_unit_id:'u',fiscal_year:2026,revenue:10,cost_of_sales:2,sga:3,opening_cash:4,operating_cf:2,investing_cf:-1,financing_cf:0,tax_rate:.3,opening_invested_capital:10,opening_assets:15,receivables:2,inventory:0,payables:1,fixed_assets:9,short_term_debt:0,long_term_debt:0,version:1}],months:[],invoices:[],settlements:[],management:{values:[],milestones:[]}} as FinanceWorkspace;
test('reporting keeps actual formulas and refuses partial or missing scenarios',()=>{
 assert.deepEqual(scenarioSummary(finance,2026,'actual'),{revenue:10,operatingProfit:5,cash:5});
 assert.deepEqual(scenarioSummary(finance,2026,'budget'),{revenue:null,operatingProfit:null,cash:null});
 const data=structuredClone(finance);data.management!.values=[{entity_type:'finance_period',entity_id:'p',metric:'revenue',scenario:'budget',period:'2026',value:0,is_closed:false,source:'test',updated_at:'2026-10-20',version:1}];
 assert.deepEqual(scenarioSummary(data,2026,'budget'),{revenue:0,operatingProfit:null,cash:null});
});
test('latest KPI period comes from history, not a fabricated monthly split',()=>{
 assert.equal(latestKpiPeriod({history:[{kpi_id:'k',month:'2026-09',value:1},{kpi_id:'k',month:'2026-10',value:2}]} as never,'k'),'2026-10');
 assert.equal(latestKpiPeriod({history:[]} as never,'k'),'current');
});
test('dated registered KPI budget is a plan and explicit configured seasonality takes priority',()=>{
 const k={id:'kpi-partners',direction:'up' as const};
 const values=[{entity_type:'kpi',entity_id:k.id,metric:'actual',scenario:'budget',period:'2026-10',value:20}];
 assert.equal(getKpiConfig(k,values).monthlyPlan['2026-10'],20);
 const previous=kpiConfig[k.id].monthlyPlan;
 try{kpiConfig[k.id].monthlyPlan={'2026-10':24};assert.equal(getKpiConfig(k,values).monthlyPlan['2026-10'],24);}finally{kpiConfig[k.id].monthlyPlan=previous;}
});
test('explicit prior-year points affect comparison even without an old canonical record',()=>{
 const data=structuredClone(finance);data.management!.values=[{entity_type:'finance_period',entity_id:'p',metric:'revenue',scenario:'prior_year',period:'2026',value:4,is_closed:false,source:'test',updated_at:'2026-10-20',version:1}];
 assert.equal(scenarioSummary(data,2026,'prior_year').revenue,4);
 assert.equal(scenarioSummary(data,2026,'prior_year').operatingProfit,null);
});
test('fiscal closing advances into next calendar March only with complete contiguous months',()=>{
 const data=structuredClone(finance);
 data.months=Array.from({length:12},(_,i)=>({id:'m'+i,finance_period_id:'p',month_index:i,version:1,revenue:1,cost_of_sales:0,sga_people:0,sga_cloud:0,sga_marketing:0,sga_rent:0,sga_travel:0,sga_other:0}));
 data.management!.values=data.months.flatMap(m=>Object.keys(m).filter(k=>!['id','finance_period_id','month_index','version'].includes(k)).map(metric=>({entity_type:'finance_month' as const,entity_id:m.id,metric,scenario:'actual' as const,period:`${2026+(m.month_index>8?1:0)}-${String((m.month_index+3)%12+1).padStart(2,'0')}`,value:0,is_closed:true,source:'test',updated_at:'2026-10-20',version:1})));
 assert.equal(reportingFreshness(data,2026).closedThrough,'2027-03');
 data.management!.values.find(v=>v.period==='2027-02')!.is_closed=false;
 assert.equal(reportingFreshness(data,2026).closedThrough,'2027-01');
});
test('annual actuals are closed only when every canonical input is explicitly closed',()=>{
 const data=structuredClone(finance);
 data.management!.values=Object.keys(financeFieldsSchema.shape).map(metric=>({entity_type:'finance_period',entity_id:'p',metric,scenario:'actual',period:'2026',value:0,is_closed:true,source:'test',updated_at:'2026-10-20',version:1}));
 assert.equal(reportingFreshness(data,2026).annualClosed,true);
 data.management!.values[0].is_closed=false;assert.equal(reportingFreshness(data,2026).annualClosed,false);
});
test('overdue invoices identify amount and unset owner without inferring ownership',()=>{
 const data=structuredClone(finance);data.invoices=[{id:'i',finance_period_id:'p',kind:'receivable',counterparty:'テスト',issued_on:'2026-04-01',due_on:'2026-10-01',amount:2,version:1}];
 const rows=exceptionRows({kpis:[],initiatives:[],history:[],goals:[],departments:[],management:{values:[],milestones:[]}} as never,data,'2026-10-20');
 assert.equal(rows[0].amount,2);assert.equal(rows[0].owner,'未設定');assert.equal(rows[0].kind,'receivable');
});
