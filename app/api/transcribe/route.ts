import { env } from "cloudflare:workers";
import { getSession, sameOrigin } from "@/server/auth/session";

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const allowedFormats = new Map([
  ["audio/webm", "webm"],
  ["audio/ogg", "ogg"],
  ["audio/mpeg", "mp3"],
  ["audio/mp4", "mp4"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
]);

function base64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(binary);
}

export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOrigin(req))
    return Response.json({ error: "FORBIDDEN" }, { status: 403, headers });
  const session = await getSession(req);
  if (!session)
    return Response.json({ error: "SESSION_EXPIRED" }, { status: 401, headers });
  if (Number(req.headers.get("content-length") || 0) > MAX_AUDIO_BYTES + 100_000)
    return Response.json({ error: "TOO_LARGE" }, { status: 413, headers });

  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const language = form.get("lang") === "ar" ? "ar" : "fr";
    if (!(audio instanceof File) || audio.size === 0 || audio.size > MAX_AUDIO_BYTES)
      return Response.json({ error: "INVALID_AUDIO" }, { status: 400, headers });
    const mime = audio.type.split(";")[0].toLowerCase();
    const format = allowedFormats.get(mime);
    if (!format)
      return Response.json({ error: "INVALID_AUDIO" }, { status: 400, headers });

    const config = env as Record<string, string | undefined>;
    if (!config.OPENROUTER_API_KEY)
      throw new Error("AI_NOT_CONFIGURED");
    const timeout = AbortSignal.timeout(55_000);
    const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
    const response = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "AlexandreBOT",
      },
      body: JSON.stringify({
        model:
          config.OPENROUTER_TRANSCRIPTION_MODEL ||
          "openai/whisper-large-v3-turbo",
        input_audio: {
          data: base64(await audio.arrayBuffer()),
          format,
        },
        language,
        temperature: 0,
      }),
    });
    if (!response.ok) {
      console.warn("OPENROUTER_STT_FAILURE", { status: response.status });
      throw new Error(response.status === 429 ? "AI_BUSY" : "AI_PROVIDER_UNAVAILABLE");
    }
    const result = (await response.json()) as { text?: unknown; usage?: { seconds?: unknown } };
    const transcript = typeof result.text === "string" ? result.text.trim() : "";
    if (!transcript) throw new Error("AI_EMPTY");
    return Response.json(
      {
        text: transcript.slice(0, 2400),
        source: "openrouter",
        model:
          config.OPENROUTER_TRANSCRIPTION_MODEL ||
          "openai/whisper-large-v3-turbo",
      },
      { headers },
    );
  } catch (error) {
    if (req.signal.aborted)
      return Response.json({ error: "CANCELLED" }, { status: 499, headers });
    const code = error instanceof Error ? error.message : "AI_UNAVAILABLE";
    return Response.json(
      { error: code === "AI_BUSY" ? code : "AI_UNAVAILABLE" },
      { status: code === "AI_BUSY" ? 429 : 503, headers },
    );
  }
}
