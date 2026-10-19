import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { monthFieldsSchema } from "@/lib/operations";
import { updateFinance } from "@/lib/finance-mutations";
import { body, json, sameOrigin } from "@/lib/http";
const input = z
  .object({
    id: z.string().min(1).max(150),
    finance_period_id: z.string().min(1).max(100),
    version: z.number().int().positive(),
    period_version: z.number().int().positive(),
    fields: monthFieldsSchema,
  })
  .strict();
export async function PATCH(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "許可されていないアクセスです。" }, 403);
  const user = await currentUser();
  if (!user) return json({ error: "ログインしてください。" }, 401);
  const parsed = input.safeParse(await body(request).catch(() => null));
  if (!parsed.success)
    return json({ error: "金額は0以上・1円単位で入力してください。" }, 400);
  const { id, version, finance_period_id, period_version, fields } =
    parsed.data;
  return updateFinance(user, {
    id: finance_period_id,
    version: period_version,
    month: { id, version, fields },
  });
}
