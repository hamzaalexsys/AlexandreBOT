import { env } from "@/lib/server-env";
import { getSession, sameOrigin } from "@/server/auth/session";
import { SPEECH_MODEL, SPEECH_VOICE, speechText } from "@/server/voice/config";

export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers });
  if (!await getSession(req)) return Response.json({ error: "SESSION_EXPIRED" }, { status: 401, headers });
  if (Number(req.headers.get("content-length") || 0) > 24000)
    return Response.json({ error: "TOO_LARGE" }, { status: 413, headers });
  let input: { text?: unknown; lang?: unknown };
  try {
    const body = await req.text();
    if (body.length > 20000) return Response.json({ error: "TOO_LARGE" }, { status: 413, headers });
    input = JSON.parse(body);
    if (!input || typeof input !== "object" || typeof input.text !== "string" || input.text.length > 4500 || !["fr", "ar"].includes(String(input.lang)))
      return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers });
  } catch { return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers }); }
  const text = speechText(input.text as string);
  if (!text) return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers });
  const config = env as Record<string, string | undefined>;
  if (!config.OPENROUTER_API_KEY) return Response.json({ error: "AI_NOT_CONFIGURED" }, { status: 503, headers });
  const model = config.OPENROUTER_TTS_MODEL || SPEECH_MODEL;
  try {
    const response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(30_000)]),
      headers: { Authorization: `Bearer ${config.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "X-Title": "AlexandreBOT" },
      body: JSON.stringify({
        model,
        voice: config.OPENROUTER_TTS_VOICE || SPEECH_VOICE,
        input: text,
        response_format: "pcm",
        ...(model.startsWith("x-ai/") ? { provider: { options: { xai: { language: input.lang, output_format: { codec: "pcm", sample_rate: 24000 } } } } } : {}),
      }),
    });
    if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("audio/pcm")) {
      console.warn("OPENROUTER_TTS_FAILURE", { status: response.status });
      return Response.json({ error: response.status === 429 ? "AI_BUSY" : "AI_UNAVAILABLE" }, { status: response.status === 429 ? 429 : 503, headers });
    }
    // Relay bytes immediately; never buffer the entire spoken answer on the server.
    return new Response(response.body, { headers: { ...headers, "Content-Type": "audio/pcm", "X-Audio-Sample-Rate": "24000", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ error: req.signal.aborted ? "CANCELLED" : "AI_UNAVAILABLE" }, { status: req.signal.aborted ? 499 : 503, headers });
  }
}
