import {japanDate} from '../../lib/operations';
import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {ManagementWorkspace, ManagedValue, Milestone} from '../../lib/management';
import {milestoneProgress} from '../../lib/management';
import type {Workspace} from '../../lib/model';

test('management authentication, scope, null scenarios, closure and dated milestones',async({page,request,baseURL})=>{
 // This mutation suite must never target a remote deployment.
 expect(['localhost','127.0.0.1','[::1]']).toContain(new URL(baseURL!).hostname);
 const headers={Origin:baseURL!};
 expect((await request.get('/api/management')).status()).toBe(401);
 expect((await request.patch('/api/management',{headers,data:{}})).status()).toBe(401);
 const credentials=JSON.parse(readFileSync('.local/admin-local.json','utf8')) as {email:string;password:string};
 expect((await page.request.post('/api/auth/login',{headers,data:{email:credentials.email,password:credentials.password,remember:false}})).status()).toBe(200);
 const read=async()=>await(await page.request.get('/api/management')).json() as ManagementWorkspace;
 const patch=(data:object,origin=baseURL!)=>page.request.patch('/api/management',{headers:{Origin:origin},data});
 const original=await read();
 const actual=original.values.find(v=>v.entity_type==='finance_period'&&v.metric==='revenue'&&v.scenario==='actual')!;
 const payload=(v:ManagedValue)=>{const {updated_at,...fields}=v;return {kind:'value' as const,...fields};};
 expect((await patch(payload(actual),'https://other.example')).status()).toBe(403);
 expect((await patch({...payload(actual),entity_id:'other-organization-finance-period'})).status()).toBe(404);
 expect((await patch({...payload(actual),version:actual.version+100})).status()).toBe(409);
 expect((await patch({...payload(actual),organization_id:'other'})).status()).toBe(400);
 expect((await patch({...payload(actual),metric:'not-a-finance-metric'})).status()).toBe(400);
 expect((await patch({...payload(actual),period:'1900'})).status()).toBe(400);
 expect((await patch({...payload(actual),scenario:'budget',value:-1})).status()).toBe(400);
 expect((await patch({...payload(actual),scenario:'budget',metric:'tax_rate',value:1.1})).status()).toBe(400);
 const key=(v:ManagedValue)=>[v.entity_type,v.entity_id,v.metric,v.scenario,v.period].join(':');
 const find=async(v:ManagedValue)=>(await read()).values.find(p=>key(p)===key(v))!;
 const kpi=original.values.find(v=>v.entity_type==='kpi'&&v.period==='current')!;
 const budget={...kpi,period:'2099-12',scenario:'budget' as const,value:0,is_closed:false,source:'ローカルAPI試験',version:0};
 const previousBudget=original.values.find(v=>key(v)===key(budget));
 budget.version=previousBudget?.version??0;
 expect((await patch(payload(budget))).status()).toBe(200);
 let freshBudget=await find(budget);expect(freshBudget.value).toBe(0);
 expect((await patch(payload(budget))).status()).toBe(409);
 expect((await patch({...payload(freshBudget),value:null})).status()).toBe(200);
 freshBudget=await find(budget);expect(freshBudget.value).toBeNull();
 // Preserve any pre-existing local override when this test is repeated against a working DB.
 if(previousBudget?.value!=null)expect((await patch({...payload(freshBudget),value:previousBudget.value,source:previousBudget.source,is_closed:previousBudget.is_closed})).status()).toBe(200);
 try {
  expect((await patch({...payload(actual),source:'ローカル締め確認試験',is_closed:true})).status()).toBe(200);
  const closed=await find(actual);expect(closed.is_closed).toBe(true);expect(closed.source).toBe('ローカル締め確認試験');expect(closed.value).toBe(actual.value);
  expect((await patch({...payload(closed),value:actual.value!+1})).status()).toBe(400);
  expect((await find(actual)).value).toBe(actual.value);
 } finally {
  const fresh=await find(actual);
  expect((await patch({...payload(fresh),source:actual.source,is_closed:actual.is_closed})).status()).toBe(200);
 }
 const workspace=await(await page.request.get('/api/workspace')).json() as Workspace;
 const initiative=workspace.initiatives[0];
 const create={kind:'milestone_create',initiative_id:initiative.id,title:'ローカルAPI試験マイルストーン',planned_on:'2099-12-01',completed_on:null};
 expect((await patch({...create,initiative_id:'other-organization-initiative'})).status()).toBe(409);
 expect((await patch({...create,planned_on:'2026-02-30'})).status()).toBe(400);
 expect((await patch({...create,completed_on:'2099-12-01'})).status()).toBe(400);
 const created=await patch(create);expect(created.status()).toBe(200);const {id}=await created.json() as {id:string};
 let milestone=(await read()).milestones.find(m=>m.id===id)!;expect(milestoneProgress([milestone])).toBe(0);
 const edit=(m:Milestone)=>({kind:'milestone',...m});
 expect((await patch({...edit(milestone),completed_on:japanDate()})).status()).toBe(200);
 expect((await patch({...edit(milestone),title:'stale'})).status()).toBe(409);
 milestone=(await read()).milestones.find(m=>m.id===id)!;expect(milestone.completed_on).toBe(japanDate());expect(milestoneProgress([milestone])).toBe(100);
 // Remove the test completion date; fixtures remain local and never become production facts.
 expect((await patch({...edit(milestone),completed_on:null})).status()).toBe(200);
});
