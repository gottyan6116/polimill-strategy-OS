import type {Kpi, Workspace} from './model';
import {kpiEvaluation} from './management';
import {getKpiConfig} from '../config/management';
import {organizationTree} from '../config/organization-tree';
import {latestKpiPeriod} from './reporting';

export function treeKpiEvaluation(kpi:Kpi,data:Workspace) {
  const period=latestKpiPeriod(data,kpi.id);
  const actual=data.history.find(h=>h.kpi_id===kpi.id&&h.month===period)?.value??null;
  return {...kpiEvaluation({...kpi,actual},getKpiConfig(kpi,data.management?.values),period),period,actual};
}
export function organizationBranches(data:Workspace) {
  const rank=(id:string)=>{const index=organizationTree.departmentOrder.indexOf(id);return index<0?Number.MAX_SAFE_INTEGER:index;};
  return [...data.departments].sort((a,b)=>rank(a.id)-rank(b.id)||a.name.localeCompare(b.name,'ja')).map(department=>{
    const goals=data.goals.filter(g=>g.department_id===department.id).map(goal=>({...goal,kpis:data.kpis.filter(k=>k.goal_id===goal.id),initiatives:data.initiatives.filter(i=>i.goal_id===goal.id)}));
    return {department,goals,kpiCount:goals.reduce((n,g)=>n+g.kpis.length,0)};
  });
}
export function organizationSummary(data:Workspace) {
  return {departments:data.departments.length,goals:data.goals.length,activeInitiatives:data.initiatives.filter(i=>organizationTree.activeStatuses.includes(i.status)).length,unsetKpis:data.kpis.filter(k=>treeKpiEvaluation(k,data).status==='unset').length};
}
/** No approved department/company aggregation exists; never average unlike KPIs. */
export function organizationProgress(_data:Workspace):number|null {return null;}
