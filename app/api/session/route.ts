import { createSession, getSession, sameOrigin } from "@/server/auth/session";
export async function POST(request: Request) {
  return createSession(request);
}
export async function GET(request: Request) {
  const session = await getSession(request);
  return Response.json(
    session
      ? { role: session.role, mode: session.mode }
      : { error: "NO_SESSION" },
    { status: session ? 200 : 401, headers: { "Cache-Control": "no-store" } },
  );
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie":
          "alex_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        "Cache-Control": "no-store",
      },
    },
  );
}
