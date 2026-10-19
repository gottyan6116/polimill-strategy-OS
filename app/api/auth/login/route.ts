import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { cookieName } from "@/lib/auth";
import { digestToken, randomToken, verifyPassword } from "@/lib/crypto";
import { body, cookieOptions, json, sameOrigin } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "許可されていないアクセスです。" }, 403);
  let input;
  try {
    input = loginSchema.parse(await body(request));
  } catch {
    return json(
      { error: "メールアドレスとパスワードを確認してください。" },
      400,
    );
  }
  const now = Math.floor(Date.now() / 1000);
  const sql = db();
  const keys = await Promise.all(
    [
      `email:${input.email}`,
      `ip:${request.headers.get("cf-connecting-ip") ?? "local"}`,
    ].map(digestToken),
  );
  // Atomic increments prevent parallel bypass. Office/VPN users share an IP,
  // so the IP ceiling is independent and higher than the per-account ceiling.
  const counters = await sql.batch(
    keys.map((key) =>
      sql
        .prepare(
          "INSERT INTO login_attempts(key,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END, reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING attempts",
        )
        .bind(key, now + 900, now, now),
    ),
  );
  if (
    counters.some(
      (r, index) =>
        Number((r.results[0] as { attempts: number }).attempts) >
        (index === 0 ? 10 : 100),
    )
  )
    return json(
      { error: "試行回数が上限に達しました。15分後に再度お試しください。" },
      429,
    );
  const user = await sql
    .prepare("SELECT id,password_hash FROM users WHERE email=?")
    .bind(input.email)
    .first<{ id: string; password_hash: string }>();
  const dummy =
    "pbkdf2-sha256$100000$00000000000000000000000000000000$" + "0".repeat(64);
  const valid = await verifyPassword(
    input.password,
    user?.password_hash ?? dummy,
  );
  if (!user || !valid)
    return json(
      { error: "メールアドレスまたはパスワードが正しくありません。" },
      401,
    );
  const jar = await cookies();
  const old = jar.get(cookieName)?.value;
  const token = randomToken();
  const lifetime = input.remember ? 7 * 86400 : 12 * 3600;
  await sql.batch([
    sql
      .prepare("DELETE FROM sessions WHERE expires_at<=? OR token_hash=?")
      .bind(now, old ? await digestToken(old) : ""),
    sql
      .prepare("INSERT INTO sessions VALUES (?,?,?)")
      .bind(await digestToken(token), user.id, now + lifetime),
    sql
      .prepare("DELETE FROM login_attempts WHERE reset_at<=? OR key=?")
      .bind(now, keys[0]),
  ]);
  jar.set(cookieName, token, cookieOptions(request, lifetime));
  return json({ ok: true });
}
