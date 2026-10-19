export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
export async function body(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Error("Invalid body");
  const raw = await request.text();
  if (raw.length > 16000) throw new Error("Too large");
  return JSON.parse(raw);
}
export function cookieOptions(request: Request, maxAge: number) {
  const url = new URL(request.url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return {
    httpOnly: true,
    secure: !local || url.protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
