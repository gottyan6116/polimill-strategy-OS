import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
async function login(page:Page){const account=JSON.parse(readFileSync('.local/admin-local.json','utf8'));await page.goto('/login');await page.getByLabel('メールアドレス',{exact:true}).fill(account.email);await page.getByLabel('パスワード',{exact:true}).fill(account.password);await page.getByRole('button',{name:'ログイン',exact:true}).click();await expect(page.getByRole('heading',{name:'経営サマリー',exact:true})).toBeVisible();}
async function verifyType(page:Page,name:string){
 expect(await page.locator('h1').evaluate(e=>getComputedStyle(e).fontSize),name).toBe('28px');
 const small=await page.locator('main,nav').evaluateAll(roots=>roots.flatMap(root=>[...root.querySelectorAll('*')].filter(e=>{
  if(!e.getClientRects().length||e.closest('[hidden],[inert],.sr-only,.visually-hidden'))return false;
  if(![...e.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent?.trim()))return false;
  const style=getComputedStyle(e);if(style.visibility==='hidden')return false;
  const scale=e instanceof SVGGraphicsElement?Math.abs(e.getScreenCTM()?.a??1):1;
  return parseFloat(style.fontSize)*scale<11.9;
 }).map(e=>({text:e.textContent?.slice(0,45),size:getComputedStyle(e).fontSize}))));expect(small,`small text in ${name}`).toEqual([]);
 const controls=await page.locator('main button:visible,main input:visible,main select:visible,nav button:visible').evaluateAll(nodes=>nodes.filter(e=>parseFloat(getComputedStyle(e).fontSize)<14).map(e=>e.textContent));expect(controls,`controls in ${name}`).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name).toBe(true);
}
test('all primary pages use readable type at desktop 100% without shrinking chart text',async({page})=>{
 await page.setViewportSize({width:1440,height:1100});await login(page);
 expect(await page.evaluate(()=>visualViewport!.scale)).toBe(1);
 await expect(page.getByRole('navigation').getByRole('button').first()).toHaveCSS('font-size','15px');
 for(const name of ['経営サマリー','組織・部門目標','KPI','実行施策']){await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();await verifyType(page,name);if(name==='組織・部門目標'){
  await expect(page.locator('.org-kpi-name').first()).toHaveCSS('font-size','16px');
  const boxes=await page.locator('.org-department-node').evaluateAll(nodes=>nodes.map(e=>e.getBoundingClientRect().y));expect(new Set(boxes.map(Math.round)).size).toBe(1);
  const connection=await page.locator('.org-tree-branches').evaluate(e=>getComputedStyle(e,'::before').borderTopWidth);expect(connection).toBe('1px');
 }}
 await page.getByRole('navigation').getByRole('button',{name:'財務分析',exact:true}).click();
 for(const name of ['ポートフォリオ','ROICツリー','財務指標','キャッシュフロー','損益・入出金']){await page.getByRole('tab',{name,exact:true}).click();await verifyType(page,name);}
});
