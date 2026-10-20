import {financeFieldsSchema} from './finance';
import {monthFieldsSchema,japanDate} from './operations';
import { z } from 'zod';
import { getKpiConfig, type KpiConfiguration } from '../config/management';
export type ManagedValue = {
 entity_type:'finance_period'|'finance_month'|'kpi'; entity_id:string; metric:string;
 scenario:'actual'|'budget'|'forecast'|'prior_year'; period:string; value:number|null;
 is_closed:boolean; source:string; updated_at:string; version:number;
};
export type Milestone = {id:string;initiative_id:string;title:string;planned_on:string;completed_on:string|null;version:number};
export type ManagementWorkspace = {values:ManagedValue[];milestones:Milestone[]};
export function comparison(actual:number|null,budget:number|null,prior:number|null) {
 return {budgetDifference:actual===null||budget===null?null:actual-budget,
 budgetPercent:actual===null||budget===null||budget===0?null:(actual-budget)/Math.abs(budget)*100,
 priorPercent:actual===null||prior===null||prior===0?null:(actual-prior)/Math.abs(prior)*100};
}
export function milestoneProgress(rows:Pick<Milestone,'completed_on'>[]):number|null {
 return rows.length?rows.filter(r=>r.completed_on!==null).length/rows.length*100:null;
}
export function kpiEvaluation(kpi:{id:string;actual:number|null;direction:'up'|'down'}, config:KpiConfiguration=getKpiConfig(kpi),period='current') {
 const plan=config.monthlyPlan[period]??null, actual=kpi.actual;
 if(plan===null||actual===null||plan===0) return {status:'unset' as const,plan,achievement:null};
 const down=(config.direction??kpi.direction)==='down';
 const achievement=down?(actual===0?(plan>=0?100:null):plan/actual*100):(plan===0?null:actual/plan*100);
 const status=achievement===null?'unset':achievement>=config.thresholds.onTrack?'on_track':achievement>=config.thresholds.attention?'attention':'missed';
 return {status:status as 'unset'|'on_track'|'attention'|'missed',plan,achievement};
}
const id=z.string().min(1).max(200);
const milestoneFields={initiative_id:id,title:z.string().trim().min(1).max(300),planned_on:z.iso.date(),completed_on:z.iso.date().nullable()};
export const managementPatchSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('value'),entity_type:z.enum(['finance_period','finance_month','kpi']),entity_id:id,metric:id,scenario:z.enum(['actual','budget','forecast','prior_year']),period:z.string().regex(/^(current|\d{4}|\d{4}-(0[1-9]|1[0-2]))$/),value:z.number().finite().min(-1e12).max(1e12).nullable(),is_closed:z.boolean(),source:z.string().trim().min(1).max(500),version:z.number().int().min(0)}).strict(),
 z.object({kind:z.literal('milestone'),id,...milestoneFields,version:z.number().int().min(1)}).strict(),
 z.object({kind:z.literal('milestone_create'),...milestoneFields}).strict(),
 ]).superRefine((data,ctx)=>{
 if(data.kind==='value') {
  const fields:Record<string,z.ZodType> = data.entity_type==='finance_period'?financeFieldsSchema.shape:data.entity_type==='finance_month'?monthFieldsSchema.shape:{actual:z.number().finite().min(0).max(1e12)};
  const validator=fields[data.metric];
  if(!validator||(data.value!==null&&!validator.safeParse(data.value).success))ctx.addIssue({code:'custom',path:['value'],message:'指標の入力範囲・精度を確認してください。'});
 } else if(data.completed_on!==null&&data.completed_on>japanDate()) {
  ctx.addIssue({code:'custom',path:['completed_on'],message:'完了日は今日以前にしてください。'});
 }
});
