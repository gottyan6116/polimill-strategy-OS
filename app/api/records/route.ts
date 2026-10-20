import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, json, sameOrigin } from "@/lib/http";
import { editSchema } from "@/lib/validation";
export async function PATCH(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "許可されていないアクセスです。" }, 403);
  const user = await currentUser();
  if (!user) return json({ error: "ログインしてください。" }, 401);
  const parsed = editSchema.safeParse(await body(request).catch(() => null));
  if (!parsed.success)
    return json(
      {
        error:
          "入力内容を確認してください。完了した施策の進捗は100%にしてください。",
      },
      400,
    );
  const { kind, id, version, ...fields } = parsed.data;
  if(kind==='initiatives'){
    const original=await db().prepare('SELECT i.progress,i.status FROM initiatives i JOIN goals g ON g.id=i.goal_id JOIN departments d ON d.id=g.department_id WHERE i.id=? AND d.organization_id=?').bind(id,user.organization_id).first<{progress:number;status:string}>();
    if(!original)return json({error:'対象の施策が見つかりません。'},409);
    if('progress' in fields&&fields.progress!==undefined&&fields.progress!==original.progress)return json({error:'進捗はマイルストーンの完了から計算します。'},400);
    delete (fields as {progress?:number}).progress;
    if('status' in fields&&fields.status==='done'&&original.status!=='done'){
      const counts=await db().prepare('SELECT COUNT(*) total,SUM(completed_on IS NOT NULL) completed FROM management_milestones WHERE initiative_id=?').bind(id).first<{total:number;completed:number}>();
      if(!counts?.total||counts.total!==counts.completed)return json({error:'完了には全マイルストーンの完了日が必要です。'},400);
    }
  }
  const columns = Object.keys(fields);
  const values = Object.values(fields);
  const scope =
    kind === "goals"
      ? "department_id IN (SELECT id FROM departments WHERE organization_id=?)"
      : "goal_id IN (SELECT g.id FROM goals g JOIN departments d ON g.department_id=d.id WHERE d.organization_id=?)";
  // Table/column names come only from the strict discriminated schema, never raw user keys.
  const results = await db().batch([
    db()
      .prepare(
        `UPDATE ${kind} SET ${columns.map((c) => `${c}=?`).join(",")},version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND ${scope} RETURNING id`,
      )
      .bind(...values, id, version, user.organization_id),
    db()
      .prepare(
        "INSERT INTO audit_log(user_id,entity_type,entity_id,version) SELECT ?,?,?,? WHERE changes()>0",
      )
      .bind(user.id, kind, id, version + 1),
  ]);
  if (!results[0].results.length)
    return json(
      { error: "別の更新がありました。画面を再読み込みしてください。" },
      409,
    );
  return json({ ok: true });
}
