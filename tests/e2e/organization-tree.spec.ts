import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {Workspace} from '../../lib/model';
async function open(page:Page){
  const account=JSON.parse(readFileSync('.local/admin-local.json','utf8'));
  await page.goto('/login');await page.getByLabel('メールアドレス',{exact:true}).fill(account.email);await page.getByLabel('パスワード',{exact:true}).fill(account.password);await page.getByRole('button',{name:'ログイン',exact:true}).click();
  await expect(page.getByRole('heading',{name:'経営サマリー',exact:true})).toBeVisible();
  if((page.viewportSize()?.width??1440)<761)await page.getByRole('button',{name:'メニューを切り替え'}).click();
  await page.getByRole('navigation').getByRole('button',{name:'組織・部門目標',exact:true}).click();
  return await(await page.request.get('/api/workspace')).json() as Workspace;
}
test('organization tree preserves hierarchy, independent collapse, details and company menu',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const data=await open(page);const tree=page.getByRole('region',{name:'組織・戦略ツリー',exact:true});
  await expect(page.getByRole('button',{name:'ツリー表示',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.org-department-node')).toHaveCount(data.departments.length);
  await expect(page.locator('.org-summary')).toContainText(String(data.goals.length));await expect(tree.getByText('全社目標は未設定',{exact:true})).toBeVisible();
  const department=data.departments.find(d=>d.id==='dept-product')!,goal=data.goals.find(g=>g.department_id===department.id)!,kpi=data.kpis.find(k=>k.goal_id===goal.id)!;
  await expect(tree.getByRole('button',{name:`${kpi.name}の詳細`,exact:true})).toBeVisible();
  await page.getByRole('button',{name:`${department.name}のKPIを折りたたむ`,exact:true}).click();await expect(page.getByRole('button',{name:`${department.name}のKPIを展開する`,exact:true})).toHaveAttribute('aria-expanded','false');await expect(tree.getByRole('button',{name:`${kpi.name}の詳細`,exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'コミュニティ部門のKPIを折りたたむ',exact:true})).toHaveAttribute('aria-expanded','true');
  await page.getByRole('button',{name:'すべて展開する',exact:true}).click();await expect(tree.getByRole('button',{name:`${kpi.name}の詳細`,exact:true})).toHaveAccessibleDescription(/達成率/);await tree.getByRole('button',{name:`${kpi.name}の詳細`,exact:true}).click();await expect(page.getByRole('dialog')).toContainText('定義');await expect(page.getByRole('dialog')).toContainText(goal.title);
  const initiative=data.initiatives.find(i=>i.goal_id===goal.id);if(initiative){await expect(page.getByRole('dialog')).toContainText('KPIへの直接の紐づけは未設定');await page.getByRole('button',{name:`${initiative.title}の施策詳細`,exact:true}).click();await expect(page.getByRole('heading',{name:initiative.title,exact:true})).toBeVisible();}
  await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
  await tree.getByRole('button',{name:`${department.name}の詳細`,exact:true}).click();await expect(page.getByRole('dialog')).toContainText(goal.title);await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
  await page.getByRole('button',{name:'全社目標の詳細メニュー',exact:true}).click();await page.getByRole('button',{name:'全社目標の登録状況を見る',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('正式な集計ルール未登録');await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
  await page.getByRole('button',{name:'すべて折りたたむ',exact:true}).click();await expect(page.locator('.org-department-toggle[aria-expanded=false]')).toHaveCount(data.departments.length);await page.getByRole('button',{name:'すべて展開する',exact:true}).click();expect(errors).toEqual([]);
});
test('list retains filters and sorting across view switches and global search still opens details',async({page})=>{
  await open(page);await page.getByRole('button',{name:'一覧表示',exact:true}).click();const list=page.locator('.org-list-view');await expect(list.getByRole('heading',{name:'組織一覧',exact:true})).toBeVisible();
  await list.getByLabel('検索',{exact:true}).fill('プロダクト');await list.getByRole('combobox',{name:/^部門/}).selectOption('dept-product');await list.getByRole('combobox',{name:/^状態/}).selectOption('set');await list.getByRole('combobox',{name:/^並べ替え/}).selectOption('goals');await expect(list.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button',{name:'ツリー表示',exact:true}).click();await page.getByRole('button',{name:'一覧表示',exact:true}).click();await expect(list.getByLabel('検索',{exact:true})).toHaveValue('プロダクト');await expect(list.getByRole('combobox',{name:/^並べ替え/})).toHaveValue('goals');await expect(list.locator('tbody tr')).toHaveCount(1);
  await page.getByLabel('組織・目標・KPI・施策を検索').fill('事業開発部門');await page.locator('.search-results button').first().click();await expect(page.getByRole('heading',{name:'事業開発部門',exact:true})).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
});
test('tree is four columns on desktop, internally scrolls on tablet and stacks on mobile',async({page})=>{
  await page.setViewportSize({width:1440,height:1100});await page.emulateMedia({reducedMotion:'reduce'});await open(page);
  const columns=()=>page.locator('.org-department-node').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width}}));
  let boxes=await columns();expect(new Set(boxes.map(r=>Math.round(r.y))).size).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:1024,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.org-tree-viewport').evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
  await page.setViewportSize({width:390,height:844});boxes=await columns();expect(new Set(boxes.map(r=>Math.round(r.y))).size).toBe(boxes.length);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'プロダクト部門のKPIを折りたたむ',exact:true}).click();await page.getByRole('button',{name:'プロダクト部門のKPIを展開する',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
