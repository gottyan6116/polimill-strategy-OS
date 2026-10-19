const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
const unhex = (s: string) =>
  Uint8Array.from(s.match(/.{2}/g) ?? [], (b) => parseInt(b, 16));
async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt as BufferSource,
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256,
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$100000$${hex(salt)}$${await derive(password, salt)}`;
}
export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (
    parts.length !== 4 ||
    parts[0] !== "pbkdf2-sha256" ||
    parts[1] !== "100000" ||
    !/^[a-f0-9]{32}$/.test(parts[2]) ||
    !/^[a-f0-9]{64}$/.test(parts[3])
  )
    return false;
  const candidate = await derive(password, unhex(parts[2]));
  let different = 0;
  for (let i = 0; i < candidate.length; i++)
    different |= candidate.charCodeAt(i) ^ parts[3].charCodeAt(i);
  return different === 0;
}
export async function digestToken(token: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(token)));
}
export function randomToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}
