import type { ManagementWorkspace } from './management';
export type Department = {
  id: string;
  name: string;
  mission: string;
  owner: string;
};
export type Goal = {
  id: string;
  department_id: string;
  title: string;
  hypothesis: string;
  owner: string;
  version: number;
  updated_at?: string;
};
export type Kpi = {
  id: string;
  goal_id: string;
  name: string;
  actual: number;
  target: number;
  unit: string;
  direction: "up" | "down";
  version: number;
  updated_at?: string;
};
export type Initiative = {
  id: string;
  goal_id: string;
  title: string;
  owner: string;
  progress: number;
  status: "planned" | "active" | "blocked" | "done";
  due_date: string;
  version: number;
  updated_at?: string;
};
export type Workspace = {
  management?: ManagementWorkspace;
  organization: { id: string; name: string };
  user: { name: string; email: string };
  departments: Department[];
  goals: Goal[];
  kpis: Kpi[];
  initiatives: Initiative[];
  history: { kpi_id: string; month: string; value: number }[];
};
export function achievement(
  kpi: Pick<Kpi, "actual" | "target" | "direction">,
): number {
  if (kpi.direction === "down")
    return kpi.actual === 0
      ? 100
      : Math.min(100, Math.round((kpi.target / kpi.actual) * 100));
  return Math.min(100, Math.round((kpi.actual / kpi.target) * 100));
}
export const statusLabels = {
  planned: "計画中",
  active: "実行中",
  blocked: "要対応",
  done: "完了",
};
