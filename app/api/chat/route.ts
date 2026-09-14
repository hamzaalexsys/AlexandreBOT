import { getSession, sameOrigin } from "@/server/auth/session";
import { inputSchema, runAgent } from "@/server/agents/orchestrator";
const quotas = new Map<string, { count: number; until: number }>();
export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOrigin(req))
    return Response.json({ error: "FORBIDDEN" }, { status: 403, headers });
  const session = await getSession(req);
  if (!session)
    return Response.json(
      { error: "SESSION_EXPIRED" },
      { status: 401, headers },
    );
  // Instance-local burst limit. Production-wide budgets belong in an API gateway/Durable Object.
  const now = Date.now();
  for (const [key, value] of quotas) if (value.until < now) quotas.delete(key);
  const quotaKey = `${session.subject}:${req.headers.get("oai-authenticated-user-id") || "local"}`;
  const quota = quotas.get(quotaKey) || { count: 0, until: now + 60000 };
  if (quota.count >= 15)
    return Response.json({ error: "SLOW_DOWN" }, { status: 429, headers });
  quota.count++;
  quotas.set(quotaKey, quota);
  try {
    if (Number(req.headers.get("content-length") || 0) > 3000000)
      return Response.json({ error: "TOO_LARGE" }, { status: 413, headers });
    const body = await req.text();
    if (body.length > 3000000)
      return Response.json({ error: "TOO_LARGE" }, { status: 413, headers });
    const parsed = inputSchema.safeParse(JSON.parse(body));
    if (!parsed.success)
      return Response.json(
        { error: "INVALID_INPUT" },
        { status: 400, headers },
      );
    return Response.json(await runAgent(parsed.data, session, req.signal), {
      headers,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "AI_UNAVAILABLE";
    console.warn(
      "AGENT_FAILURE",
      error instanceof Error ? error.name : "unknown",
      [
        "AI_INVALID_RESPONSE",
        "AI_TOOL_LIMIT",
        "AI_EMPTY",
        "AI_PROVIDER_UNAVAILABLE",
      ].includes(code)
        ? code
        : "other",
    );
    const known = ["AI_NOT_CONFIGURED", "AI_BUSY", "AI_PROVIDER_UNAVAILABLE"];
    return Response.json(
      { error: known.includes(code) ? code : "AI_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}
