import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { comparison, kpiEvaluation, milestoneProgress, managementPatchSchema } from '../lib/management.ts';
const kpi = {id:'kpi-participation',actual:80,target:120,direction:'up' as const};
test('missing plans remain unset; seasonal plan uses requested month',()=>{
 assert.equal(kpiEvaluation(kpi).status,'unset');
 assert.equal(kpiEvaluation(kpi,{monthlyPlan:{current:0},thresholds:{onTrack:100,attention:80}}).achievement,null);
 const config={direction:'up' as const,monthlyPlan:{'2026-04':100,'2026-05':80},thresholds:{onTrack:100,attention:80}};
 assert.deepEqual(kpiEvaluation(kpi,config,'2026-04'),{status:'attention',plan:100,achievement:80});
 assert.equal(kpiEvaluation(kpi,config,'2026-05').status,'on_track');
 assert.equal(kpiEvaluation(kpi,config,'2026-06').achievement,null);
 assert.equal(kpiEvaluation({...kpi,actual:0,direction:'down'}, {...config,direction:'down'},'2026-05').status,'on_track');
});
test('comparison keeps missing and zero distinct',()=>{
 assert.deepEqual(comparison(0,null,0),{budgetDifference:null,budgetPercent:null,priorPercent:null});
 assert.deepEqual(comparison(0,10,20),{budgetDifference:-10,budgetPercent:-100,priorPercent:-100});
});
test('milestones use dated completions only and no milestones is unset',()=>{
 assert.equal(milestoneProgress([]),null);
 assert.equal(milestoneProgress([{completed_on:null},{completed_on:'2026-10-20'}]),50);
});
test('strict editing schema rejects extra fields and impossible dates',()=>{
 const base={kind:'value',entity_type:'finance_period',entity_id:'p',metric:'revenue',scenario:'budget',period:'2026',value:0,is_closed:false,source:'test',version:0};
 assert.equal(managementPatchSchema.safeParse({...base,value:-1}).success,false);
 assert.equal(managementPatchSchema.safeParse({...base,metric:'tax_rate',value:1.1}).success,false);
 assert.equal(managementPatchSchema.safeParse({...base,metric:'tax_rate',value:null}).success,true);
 assert.equal(managementPatchSchema.safeParse({...base,metric:'investing_cf',value:-1}).success,true);
 assert.equal(managementPatchSchema.safeParse({...base,entity_type:'finance_month',metric:'sga_cloud',period:'2026-04',value:0.0000001}).success,false);
 assert.equal(managementPatchSchema.safeParse({...base,entity_type:'kpi',metric:'actual',period:'current',value:1e12}).success,true);
 assert.equal(managementPatchSchema.safeParse({...base,entity_type:'kpi',metric:'actual',period:'current',value:-1}).success,false);
 assert.equal(managementPatchSchema.safeParse({kind:'milestone_create',initiative_id:'i',title:'m',planned_on:'2099-12-01',completed_on:'2099-12-01'}).success,false);

 assert.equal(managementPatchSchema.safeParse({kind:'milestone_create',initiative_id:'i',title:'m',planned_on:'2026-02-30',completed_on:null}).success,false);
 assert.equal(managementPatchSchema.safeParse({kind:'value',entity_type:'kpi',entity_id:'k',metric:'actual',scenario:'budget',period:'current',value:0,is_closed:false,source:'test',version:0,organization_id:'other'}).success,false);
});
test('migration preserves all original facts, seeds exact actuals, synchronizes edits without inventing plans',()=>{
 const db=new DatabaseSync(':memory:');
 for(const file of readdirSync('migrations').sort().filter(f=>f.endsWith('.sql')&&!f.startsWith('0005'))) db.exec(readFileSync(`migrations/${file}`,'utf8'));
 const before=db.prepare('SELECT * FROM finance_periods').all();
 const beforeMonths=db.prepare('SELECT * FROM finance_months').all();
 const beforeKpis=db.prepare('SELECT * FROM kpis').all();
 const beforeHistory=db.prepare('SELECT * FROM kpi_history').all();
 const initiatives=db.prepare('SELECT * FROM initiatives').all();
 db.exec(readFileSync('migrations/0005_management_reporting.sql','utf8'));
 assert.deepEqual(db.prepare('SELECT * FROM finance_periods').all(),before);
 assert.deepEqual(db.prepare('SELECT * FROM finance_months').all(),beforeMonths);
 assert.deepEqual(db.prepare('SELECT * FROM kpis').all(),beforeKpis);
 assert.deepEqual(db.prepare('SELECT * FROM kpi_history').all(),beforeHistory);
 for(const row of before) for(const metric of ['revenue','cost_of_sales','sga','tax_rate','operating_cf','investing_cf','financing_cf']) assert.equal(db.prepare("SELECT value FROM management_values WHERE entity_id=? AND metric=? AND scenario='actual'").get(row.id,metric)!.value,row[metric]);
 assert.deepEqual(db.prepare('SELECT * FROM initiatives').all(),initiatives);
 assert.equal(db.prepare('SELECT count(*) n FROM management_milestones').get()!.n,0);
 assert.equal(db.prepare("SELECT count(*) n FROM management_values WHERE scenario!='actual' AND value IS NOT NULL").get()!.n,0);
 assert.equal(db.prepare("SELECT value FROM management_values WHERE entity_id='kpi-participation' AND period='current' AND scenario='actual'").get()!.value,7800);
 db.exec("UPDATE kpis SET actual=7801, version=version+1 WHERE id='kpi-participation'");
 assert.equal(db.prepare("SELECT value FROM management_values WHERE entity_id='kpi-participation' AND period='current' AND scenario='actual'").get()!.value,7801);
 assert.equal(db.prepare("SELECT value FROM management_values WHERE entity_id='kpi-participation' AND period='2026-10' AND scenario='actual'").get()!.value,7800);
 db.exec("UPDATE finance_months SET sga_cloud=9 WHERE id='business-civic-2026-m0'");
 assert.equal(db.prepare("SELECT value FROM management_values WHERE entity_id='business-civic-2026-m0' AND metric='sga_cloud' AND scenario='actual'").get()!.value,9);
 db.exec("UPDATE management_values SET source='確認済資料',is_closed=1 WHERE entity_id='business-civic-2026' AND metric='revenue'");
 db.exec("UPDATE finance_periods SET revenue=321 WHERE id='business-civic-2026'");
 assert.deepEqual({...db.prepare("SELECT value,source,is_closed FROM management_values WHERE entity_id='business-civic-2026' AND metric='revenue' AND scenario='actual'").get()},{value:321,source:'確認済資料',is_closed:0});
 db.exec("UPDATE management_values SET is_closed=1 WHERE entity_id='business-civic-2026' AND metric='revenue'");
 db.exec("UPDATE finance_periods SET revenue=321 WHERE id='business-civic-2026'");
 assert.equal(db.prepare("SELECT is_closed FROM management_values WHERE entity_id='business-civic-2026' AND metric='revenue' AND scenario='actual'").get()!.is_closed,1);
 db.close();
});
