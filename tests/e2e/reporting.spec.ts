import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {FinanceWorkspace} from '../../lib/finance';
import type {ManagedValue} from '../../lib/management';
import {monthFieldsSchema} from '../../lib/operations';
async function login(page:Page){const a=JSON.parse(readFileSync('.local/admin-local.json','utf8'));await page.goto('/login');await page.getByLabel('メールアドレス',{exact:true}).fill(a.email);await page.getByLabel('パスワード',{exact:true}).fill(a.password);await page.getByRole('button',{name:'ログイン',exact:true}).click();await expect(page.getByRole('heading',{name:'経営サマリー',exact:true})).toBeVisible();await expect(page.locator('.summary-value').first()).not.toContainText('未設定');}
test('executive summary, editable missing scenarios and direct exception drilldown',async({page})=>{
 await login(page);await expect(page.getByText('全社KPI達成率',{exact:true})).toHaveCount(0);await expect(page.locator('.status-overview')).toContainText('未判定');await expect(page.locator('.freshness')).toContainText('締め済み月なし');
 await page.getByRole('button',{name:'予算・見込み・締め情報を編集',exact:true}).click();await page.getByLabel('数値データの対象').selectOption('business-civic-2026');await page.getByLabel('数値データの項目').selectOption('revenue');await page.getByLabel('観測値').fill('0');await page.getByLabel('出典',{exact:true}).fill('ローカル画面検証');await page.getByRole('button',{name:'数値データを保存',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
 const f=await(await page.request.get('/api/finance')).json() as FinanceWorkspace;expect(f.management?.values.find(v=>v.entity_id==='business-civic-2026'&&v.metric==='revenue'&&v.scenario==='budget')?.value).toBe(0);
 await page.getByRole('button',{name:'予算・見込み・締め情報を編集',exact:true}).click();await page.getByLabel('数値データの対象').selectOption('business-civic-2026');await page.getByLabel('数値データの項目').selectOption('revenue');await page.getByLabel('観測値').fill('');await page.getByRole('button',{name:'数値データを保存',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
 const row=page.locator('.exception-section tbody tr').first();const party=await row.locator('strong').innerText();await row.getByRole('button',{name:'詳細を見る',exact:true}).click();await expect(page.getByRole('dialog')).toContainText(party);await expect(page.getByLabel('取引先を検索')).toHaveValue(party);await page.getByRole('button',{name:'入出金明細を閉じる'}).click();
});
test('financial labels are inside SVGs and all primary surfaces fit mobile',async({page})=>{
 await login(page);await page.getByRole('button',{name:'財務分析',exact:true}).click();
 for(const name of ['ポートフォリオ','ROICツリー','財務指標','キャッシュフロー','損益・入出金']){
  await page.getByRole('tab',{name,exact:true}).click();expect(await page.locator('main').innerText()).not.toContain('38.080003');
  const clipped=await page.locator('svg:visible').evaluateAll(svgs=>svgs.flatMap(svg=>{const view=(svg as SVGSVGElement).viewBox.baseVal;if(!view.width)return [];return [...svg.querySelectorAll('text')].filter(text=>{const b=text.getBBox();return b.x<view.x-1||b.y<view.y-1||b.x+b.width>view.x+view.width+1||b.y+b.height>view.y+view.height+1}).map(t=>t.textContent)}));expect(clipped,`clipped labels in ${name}`).toEqual([]);
 }
 await page.getByRole('button',{name:'累計',exact:true}).click();await expect(page.getByRole('img',{name:/売上高の累計推移/})).toBeVisible();
 await page.setViewportSize({width:390,height:844});for(const name of ['ポートフォリオ','ROICツリー','財務指標','キャッシュフロー','損益・入出金']){await page.getByRole('tab',{name,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name).toBe(true)}
 for(const name of ['経営サマリー','KPI','実行施策','組織・部門目標']){await page.getByRole('button',{name:'メニューを切り替え'}).click();await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name).toBe(true)}
});
test('dated closing, forecasts and budgets drive monthly and cumulative graphs without changing actuals',async({page,baseURL})=>{
 expect(['localhost','127.0.0.1']).toContain(new URL(baseURL!).hostname);await login(page);
 const data=await(await page.request.get('/api/finance')).json() as FinanceWorkspace;
 const months=data.months.filter(m=>m.finance_period_id==='business-civic-2026').sort((a,b)=>a.month_index-b.month_index);
 const originals:ManagedValue[]=[];
 const read=async()=>((await(await page.request.get('/api/finance')).json()) as FinanceWorkspace).management!.values;
 const key=(v:ManagedValue)=>[v.entity_type,v.entity_id,v.metric,v.scenario,v.period].join(':');
 const save=async(v:ManagedValue)=>{const {updated_at,...fields}=v;expect((await page.request.patch('/api/management',{headers:{Origin:baseURL!},data:{kind:'value',...fields}})).status()).toBe(200)};
 try{
  for(const [index,scenario] of [[0,'actual'],[0,'budget'],[1,'budget'],[1,'forecast']] as const)for(const metric of Object.keys(monthFieldsSchema.shape)){
   const month=months[index],existing=data.management!.values.find(v=>v.entity_id===month.id&&v.metric===metric&&v.scenario===scenario)!;
   const initial:ManagedValue=existing??{entity_type:'finance_month',entity_id:month.id,metric,scenario,period:`2026-0${index+4}`,value:null,is_closed:false,source:'未設定',updated_at:'',version:0};originals.push(initial);
   await save({...initial,value:month[metric as keyof typeof month] as number,is_closed:scenario==='actual',source:'ローカル表示検証'});
  }
  await page.getByRole('button',{name:'財務分析',exact:true}).click();await page.getByLabel('財務分析の事業').selectOption('business-civic');await page.getByRole('tab',{name:'損益・入出金',exact:true}).click();
  const graph=page.locator('.ops-profit svg');await expect(graph.locator('rect')).toHaveCount(2);await expect(graph.getByText(/^実績 /)).toBeVisible();await expect(graph.getByText(/^見込み /)).toBeVisible();await expect(graph.getByText(/^予算 /)).toBeVisible();
  await page.getByRole('button',{name:'累計',exact:true}).click();await expect(page.getByRole('img',{name:/営業損益の累計推移/})).toBeVisible();await expect(graph.locator('rect')).toHaveCount(2);
  const final=await(await page.request.get('/api/finance')).json() as FinanceWorkspace;for(const month of months)expect(final.months.find(m=>m.id===month.id)).toEqual(month);
 }finally{const fresh=await read();for(const old of originals){const current=fresh.find(v=>key(v)===key(old));if(current)await save({...old,version:current.version});}}
});
