import { env } from "cloudflare:workers";
import type { Workspace, Department, Goal, Kpi, Initiative } from "./model";
export const db = () => env.DB;
export type User = {
  id: string;
  organization_id: string;
  name: string;
  email: string;
};
export async function getWorkspace(user: User): Promise<Workspace> {
  const sql = db();
  const org = user.organization_id;
  const [organization, departments, goals, kpis, initiatives, history] =
    await Promise.all([
      sql
        .prepare("SELECT id,name FROM organizations WHERE id=?")
        .bind(org)
        .first<{ id: string; name: string }>(),
      sql
        .prepare(
          "SELECT id,name,mission,owner FROM departments WHERE organization_id=? ORDER BY rowid",
        )
        .bind(org)
        .all<Department>(),
      sql
        .prepare(
          "SELECT g.* FROM goals g JOIN departments d ON g.department_id=d.id WHERE d.organization_id=? ORDER BY g.rowid",
        )
        .bind(org)
        .all<Goal>(),
      sql
        .prepare(
          "SELECT k.* FROM kpis k JOIN goals g ON k.goal_id=g.id JOIN departments d ON g.department_id=d.id WHERE d.organization_id=? ORDER BY k.rowid",
        )
        .bind(org)
        .all<Kpi>(),
      sql
        .prepare(
          "SELECT i.* FROM initiatives i JOIN goals g ON i.goal_id=g.id JOIN departments d ON g.department_id=d.id WHERE d.organization_id=? ORDER BY i.due_date",
        )
        .bind(org)
        .all<Initiative>(),
      sql
        .prepare(
          "SELECT h.* FROM kpi_history h JOIN kpis k ON h.kpi_id=k.id JOIN goals g ON k.goal_id=g.id JOIN departments d ON g.department_id=d.id WHERE d.organization_id=? ORDER BY h.month",
        )
        .bind(org)
        .all<{ kpi_id: string; month: string; value: number }>(),
    ]);
  if (!organization) throw new Error("Organization missing");
  return {
    organization,
    user: { name: user.name, email: user.email },
    departments: departments.results,
    goals: goals.results,
    kpis: kpis.results,
    initiatives: initiatives.results,
    history: history.results,
  };
}
