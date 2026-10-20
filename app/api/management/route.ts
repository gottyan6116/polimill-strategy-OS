import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { body,json,sameOrigin } from '@/lib/http';
import { getManagement } from '@/lib/management-db';
import { managementPatchSchema } from '@/lib/management';
import { financeFieldsSchema } from '@/lib/finance';
import { monthFieldsSchema } from '@/lib/operations';
export async function GET() {
 const user=await currentUser();
 if(!user)return json({error:'ログインしてください。'},401);
 return json(await getManagement(user));
}
const initiativeScope='initiative_id IN (SELECT i.id FROM initiatives i JOIN goals g ON g.id=i.goal_id JOIN departments d ON d.id=g.department_id WHERE d.organization_id=?)';
export async function PATCH(request:Request) {
 if(!sameOrigin(request))return json({error:'許可されていないアクセスです。'},403);
 const user=await currentUser();
 if(!user)return json({error:'ログインしてください。'},401);
 const parsed=managementPatchSchema.safeParse(await body(request).catch(()=>null));
 if(!parsed.success)return json({error:'入力内容を確認してください。'},400);
 const data=parsed.data,sql=db();
 let statement:D1PreparedStatement, entity:string,id:string,version:number;
 if(data.kind==='value') {
  const scope=data.entity_type==='kpi'
   ? 'SELECT k.id FROM kpis k JOIN goals g ON g.id=k.goal_id JOIN departments d ON d.id=g.department_id WHERE k.id=? AND d.organization_id=?'
   :data.entity_type==='finance_period'
    ? 'SELECT p.id,CAST(p.fiscal_year AS TEXT) period FROM finance_periods p JOIN finance_business_units b ON b.id=p.business_unit_id WHERE p.id=? AND b.organization_id=?'
    : "SELECT m.id,printf('%04d-%02d',p.fiscal_year + (m.month_index+3)/12,(m.month_index+3)%12+1) period FROM finance_months m JOIN finance_periods p ON p.id=m.finance_period_id JOIN finance_business_units b ON b.id=p.business_unit_id WHERE m.id=? AND b.organization_id=?";
  const owned=await sql.prepare(scope).bind(data.entity_id,user.organization_id).first<{id:string;period?:string}>();
  if(!owned)return json({error:'対象が見つかりません。'},404);
  const metrics=data.entity_type==='kpi'?['actual']:Object.keys(data.entity_type==='finance_period'?financeFieldsSchema.shape:monthFieldsSchema.shape);
  if(!metrics.includes(data.metric)||(owned.period&&owned.period!==data.period)||(data.entity_type==='kpi'&&data.period!=='current'&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(data.period)))return json({error:'対象の指標・期間を確認してください。'},400);
  if(data.scenario==='actual') {
   // Canonical actual amounts are edited by the existing editors, whose triggers sync this ledger.
   const current=await sql.prepare('SELECT value FROM management_values WHERE organization_id=? AND entity_type=? AND entity_id=? AND metric=? AND scenario=? AND period=?').bind(user.organization_id,data.entity_type,data.entity_id,data.metric,data.scenario,data.period).first<{value:number|null}>();
   if(!current||current.value!==data.value)return json({error:'実績値は既存の実績編集から更新してください。締め状況・出典はここで編集できます。'},400);
  }
  const key=[user.organization_id,data.entity_type,data.entity_id,data.metric,data.scenario,data.period];
  statement=data.version===0
   ?sql.prepare('INSERT OR IGNORE INTO management_values(organization_id,entity_type,entity_id,metric,scenario,period,value,is_closed,source) VALUES (?,?,?,?,?,?,?,?,?) RETURNING entity_id').bind(...key,data.value,Number(data.is_closed),data.source)
   :sql.prepare('UPDATE management_values SET value=?,is_closed=?,source=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE organization_id=? AND entity_type=? AND entity_id=? AND metric=? AND scenario=? AND period=? AND version=? AND (scenario!=\'actual\' OR value IS ?) RETURNING entity_id').bind(data.value,Number(data.is_closed),data.source,...key,data.version,data.value);
  entity='management_value';id=`${data.entity_type}:${data.entity_id}:${data.metric}:${data.scenario}:${data.period}`;version=data.version+1;
 } else {
  entity='management_milestone';id=data.kind==='milestone_create'?crypto.randomUUID():data.id;version=data.kind==='milestone_create'?1:data.version+1;
  statement=data.kind==='milestone_create'
   ?sql.prepare(`INSERT INTO management_milestones(id,initiative_id,title,planned_on,completed_on) SELECT ?,?,?,?,? WHERE ? IN (SELECT i.id FROM initiatives i JOIN goals g ON g.id=i.goal_id JOIN departments d ON d.id=g.department_id WHERE d.organization_id=?) RETURNING id`).bind(id,data.initiative_id,data.title,data.planned_on,data.completed_on,data.initiative_id,user.organization_id)
   :sql.prepare(`UPDATE management_milestones SET title=?,planned_on=?,completed_on=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND initiative_id=? AND version=? AND ${initiativeScope} RETURNING id`).bind(data.title,data.planned_on,data.completed_on,id,data.initiative_id,data.version,user.organization_id);
 }
 const results=await sql.batch([statement,sql.prepare('INSERT INTO audit_log(user_id,entity_type,entity_id,version) SELECT ?,?,?,? WHERE changes()>0').bind(user.id,entity,id,version)]);
 if(!results[0].results.length)return json({error:'別の更新がありました。再読み込みして確認してください。'},409);
 return json({ok:true,id,version});
}
