import {test} from 'node:test';
import assert from 'node:assert/strict';
import {organizationBranches,organizationSummary,treeKpiEvaluation,organizationProgress} from '../lib/organization-tree.ts';
import type {Workspace} from '../lib/model';
const data:Workspace={organization:{id:'o',name:'架空組織'},user:{name:'担当',email:'demo@example.invalid'},departments:[{id:'dept-product',name:'プロダクト',mission:'品質',owner:'P'},{id:'dept-corporate',name:'コーポレート',mission:'基盤',owner:'C'}],goals:[{id:'g',department_id:'dept-product',title:'目標',hypothesis:'仮説',owner:'P',version:1}],kpis:[{id:'k',goal_id:'g',name:'指標',actual:99,target:100,unit:'人',direction:'up',version:1}],initiatives:[{id:'i',goal_id:'g',title:'施策',owner:'P',progress:80,status:'active',due_date:'2026-12-01',version:1}],history:[{kpi_id:'k',month:'2026-10',value:10}],management:{values:[],milestones:[]}};
test('tree follows goal ownership and preferred department order without mutating facts',()=>{
 const original=JSON.stringify(data),branches=organizationBranches(data);
 assert.deepEqual(branches.map(b=>b.department.id),['dept-corporate','dept-product']);
 assert.equal(branches[0].goals.length,0);assert.equal(branches[1].goals[0].kpis[0].id,'k');assert.equal(branches[1].kpiCount,1);
 assert.equal(JSON.stringify(data),original);
});
test('summary counts real entities and unset dated comparisons',()=>{
 assert.deepEqual(organizationSummary(data),{departments:2,goals:1,activeInitiatives:1,unsetKpis:1});
 assert.deepEqual(organizationSummary({...data,departments:[],goals:[],kpis:[],initiatives:[]}),{departments:0,goals:0,activeInitiatives:0,unsetKpis:0});
});
test('KPI progress uses dated plan, not annual target or undated current value',()=>{
 assert.equal(treeKpiEvaluation(data.kpis[0],data).achievement,null);
 const configured=structuredClone(data);configured.management!.values=[{entity_type:'kpi',entity_id:'k',metric:'actual',scenario:'budget',period:'2026-10',value:20,is_closed:false,source:'test',updated_at:'2026-10-20',version:1}];
 assert.equal(treeKpiEvaluation(configured.kpis[0],configured).achievement,50);
 assert.equal(treeKpiEvaluation({...configured.kpis[0],direction:'down'},configured).achievement,200);
 assert.equal(organizationProgress(data),null);
});
test('new departments are retained and unlinked KPI data is not assigned by guesswork',()=>{
 const extra=structuredClone(data);extra.departments.push({id:'other',name:'追加部門',mission:'',owner:''});extra.kpis.push({...data.kpis[0],id:'orphan',goal_id:'missing'});
 assert.equal(organizationBranches(extra).at(-1)?.department.id,'other');assert.equal(organizationBranches(extra).flatMap(b=>b.goals.flatMap(g=>g.kpis)).some(k=>k.id==='orphan'),false);
});
