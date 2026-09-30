import { mkdir, writeFile } from "node:fs/promises";

const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error("OPENROUTER_API_KEY is required");

const models = process.argv.includes("--xai-only") ? [
  ["x-ai/grok-voice-tts-1.0", "ara"],
  ["x-ai/grok-voice-tts-1.0", "sal"],
  ["x-ai/grok-voice-tts-1.0", "leo"],
] : [
  ["google/gemini-3.8-flash-tts", "Achird"],
  ["google/gemini-3.8-flash-lite-tts", "Achird"],
  ["google/gemini-3.1-flash-tts-preview", "Achird"],
  ["mistralai/voxtral-mini-tts-2603", "fr_marie_neutral"],
  ["x-ai/grok-voice-tts-1.0", "leo"],
];
const input = "Bonjour. Fahd progresse bien en français cette année. Continuons à l'encourager avec des lectures courtes à la maison.";

for (const [model, voice] of models) {
  const started = performance.now();
  try {
    const response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "AlexandreBOT latency check" },
      body: JSON.stringify({ model, voice, input, response_format: "pcm" }),
      signal: AbortSignal.timeout(30_000),
    });
    const headersMs = Math.round(performance.now() - started);
    if (!response.ok || !response.body) {
      console.log(JSON.stringify({ model, voice, status: response.status, headersMs }));
      continue;
    }
    const reader = response.body.getReader();
    let firstByteMs = null;
    let bytes = 0;
    const chunks = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      firstByteMs ??= Math.round(performance.now() - started);
      bytes += value.byteLength;
      if (process.argv.includes("--save")) chunks.push(Buffer.from(value));
    }
    if (chunks.length && response.headers.get("content-type")?.includes("audio/pcm")) {
      const pcm = Buffer.concat(chunks);
      const wav = Buffer.alloc(44 + pcm.length);
      wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4);
      wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16);
      wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
      wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28);
      wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
      wav.write("data", 36); wav.writeUInt32LE(pcm.length, 40);
      pcm.copy(wav, 44);
      await mkdir(".sites-runtime/tts-bench", { recursive: true });
      await writeFile(`.sites-runtime/tts-bench/${model.replaceAll("/", "-")}-${voice}.wav`, wav);
      if (process.argv.includes("--transcribe")) {
        const transcriptResponse = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "AlexandreBOT pronunciation check" },
          body: JSON.stringify({ model: "openai/gpt-4o-transcribe", input_audio: { data: wav.toString("base64"), format: "wav" }, language: "fr", temperature: 0 }),
          signal: AbortSignal.timeout(20_000),
        });
        const transcript = await transcriptResponse.json().catch(() => ({}));
        console.log(JSON.stringify({ model, transcriptionStatus: transcriptResponse.status, transcript: transcript.text }));
      }
    }
    console.log(JSON.stringify({ model, voice, status: response.status, contentType: response.headers.get("content-type"), headersMs, firstByteMs, totalMs: Math.round(performance.now() - started), bytes }));
  } catch (error) {
    console.log(JSON.stringify({ model, voice, error: error instanceof Error ? error.name : "unknown" }));
  }
}
