import { db, type User } from './db';
import type { ManagedValue, ManagementWorkspace, Milestone } from './management';
export async function getManagement(user:User):Promise<ManagementWorkspace> {
 const [values,milestones]=await db().batch([
  db().prepare(`SELECT v.entity_type,v.entity_id,v.metric,v.scenario,v.period,v.value,v.is_closed,v.source,v.updated_at,v.version FROM management_values v WHERE v.organization_id=? AND (
   (v.entity_type='kpi' AND EXISTS (SELECT 1 FROM kpis k JOIN goals g ON g.id=k.goal_id JOIN departments d ON d.id=g.department_id WHERE k.id=v.entity_id AND d.organization_id=v.organization_id)) OR
   (v.entity_type='finance_period' AND EXISTS (SELECT 1 FROM finance_periods p JOIN finance_business_units b ON b.id=p.business_unit_id WHERE p.id=v.entity_id AND b.organization_id=v.organization_id)) OR
   (v.entity_type='finance_month' AND EXISTS (SELECT 1 FROM finance_months m JOIN finance_periods p ON p.id=m.finance_period_id JOIN finance_business_units b ON b.id=p.business_unit_id WHERE m.id=v.entity_id AND b.organization_id=v.organization_id))
  ) ORDER BY v.entity_type,v.entity_id,v.metric,v.period,v.scenario`).bind(user.organization_id),
  db().prepare('SELECT m.id,m.initiative_id,m.title,m.planned_on,m.completed_on,m.version FROM management_milestones m JOIN initiatives i ON i.id=m.initiative_id JOIN goals g ON g.id=i.goal_id JOIN departments d ON d.id=g.department_id WHERE d.organization_id=? ORDER BY m.planned_on,m.id').bind(user.organization_id),
 ]);
 return {values:(values.results as (Omit<ManagedValue,'is_closed'>&{is_closed:number})[]).map(v=>({...v,is_closed:!!v.is_closed})),milestones:milestones.results as Milestone[]};
}
