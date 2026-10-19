import { currentUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/db";
import { json } from "@/lib/http";
export async function GET() {
  const user = await currentUser();
  if (!user) return json({ error: "ログインしてください。" }, 401);
  return json(await getWorkspace(user));
}
