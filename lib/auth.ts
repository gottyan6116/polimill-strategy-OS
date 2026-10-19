import { cookies } from "next/headers";
import { db, type User } from "./db";
import { digestToken } from "./crypto";
export const cookieName = "polimill_session";
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return db()
    .prepare(
      "SELECT u.id,u.organization_id,u.name,u.email FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?",
    )
    .bind(await digestToken(token), Math.floor(Date.now() / 1000))
    .first<User>();
}
