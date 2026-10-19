import { cookies } from "next/headers";
import { cookieName } from "@/lib/auth";
import { db } from "@/lib/db";
import { digestToken } from "@/lib/crypto";
import { json, sameOrigin, cookieOptions } from "@/lib/http";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "許可されていないアクセスです。" }, 403);
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token)
    await db()
      .prepare("DELETE FROM sessions WHERE token_hash=?")
      .bind(await digestToken(token))
      .run();
  jar.set(cookieName, "", cookieOptions(request, 0));
  return json({ ok: true });
}
