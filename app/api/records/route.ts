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
