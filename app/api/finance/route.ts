import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getFinance } from "@/lib/finance-db";
import { financeFieldsSchema } from "@/lib/finance";
import { updateFinance } from "@/lib/finance-mutations";
import { body, json, sameOrigin } from "@/lib/http";
const edit = z
  .object({
    id: z.string().min(1).max(100),
    version: z.number().int().positive(),
    fields: financeFieldsSchema,
  })
  .strict();
export async function GET() {
  const user = await currentUser();
  if (!user) return json({ error: "ログインしてください。" }, 401);
  return json(await getFinance(user));
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "許可されていないアクセスです。" }, 403);
  const user = await currentUser();
  if (!user) return json({ error: "ログインしてください。" }, 401);
  const parsed = edit.safeParse(await body(request).catch(() => null));
  if (!parsed.success)
    return json({ error: "入力内容または残高を確認してください。" }, 400);
  return updateFinance(user, parsed.data);
}
