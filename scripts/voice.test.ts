import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { pcmToWav, resample, SpeechSegmenter } from "../lib/voice/audio";
import { TranscriptionQueue } from "../lib/voice/transcription";
import { playPcm } from "../lib/voice/playback";
import { createSession } from "../server/auth/session";
import { POST as transcribe } from "../app/api/transcribe/route";
import { POST as speech } from "../app/api/speech/route";
import { POST as chat } from "../app/api/chat/route";
import { GET as child } from "../app/api/child/route";
import { speechText } from "../server/voice/config";

const wav = new DataView(await pcmToWav(new Float32Array([-1, 0, 1]), 16000).arrayBuffer());
assert.equal(wav.getUint32(24, true), 16000);
assert.equal(wav.getUint32(40, true), 6);
assert.equal(wav.getInt16(44, true), -32768);
assert.equal(wav.getInt16(48, true), 32767);
for (const rate of [44100, 48000]) assert.equal(resample(new Float32Array(rate), rate).length, 16000);
const segments: Float32Array[] = [];
const segmenter = new SpeechSegmenter(16000, frame => segments.push(frame));
for (let i = 0; i < 50; i++) segmenter.push(new Float32Array(1600));
assert.equal(segments.length, 0, "silence must not trigger transcription");
for (let i = 0; i < 9; i++) segmenter.push(new Float32Array(1600).fill(0.1));
for (let i = 0; i < 5; i++) segmenter.push(new Float32Array(1600));
assert.equal(segments.length, 1, "phrase is submitted before Stop");
segmenter.push(new Float32Array(3200).fill(0.2));
segmenter.flush();
assert.equal(segments.length, 2, "Stop flushes the final spoken word");
segmenter.flush();
assert.equal(segments.length, 2, "double Stop cannot duplicate speech");
assert.equal(segments.flatMap(samples => [...samples]).filter(sample => sample > 0).length, 17600, "all voiced samples retained exactly once");
let callStops = 0;
const callSegments: Float32Array[] = [];
const callSegmenter = new SpeechSegmenter(16000, frame => callSegments.push(frame), 1.25, () => callStops++);
for (let i = 0; i < 4; i++) callSegmenter.push(new Float32Array(1600).fill(.2));
for (let i = 0; i < 13; i++) callSegmenter.push(new Float32Array(1600));
assert.equal(callStops, 1, "a spoken phrase followed by a pause ends the call turn");
assert.equal(callSegments.length, 1, "the spoken audio is queued before auto-stop");
callSegmenter.flush();
assert.equal(callSegments.length, 1, "manual Stop after silence cannot queue a duplicate");

type Job = { resolve: (text: string) => void; reject: (error: Error) => void };
const jobs: Job[] = [];
const controller = new AbortController();
const queue = new TranscriptionQueue(() => new Promise((resolve, reject) => jobs.push({ resolve, reject })), () => {}, controller.signal);
queue.add(new Blob(["1"])); queue.add(new Blob(["2"])); queue.add(new Blob(["3"]));
assert.equal(jobs.length, 2, "at most two simultaneous requests");
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
jobs[1].resolve("Hamza"); await tick();
assert.equal(jobs.length, 3);
jobs[2].resolve("demain"); jobs[0].resolve("Fahd");
assert.equal(await queue.finish(), "Fahd Hamza demain", "network order never changes spoken order");

let tries = 0;
const retryQueue = new TranscriptionQueue(async () => { if (++tries === 1) throw new Error("offline"); return "Fahd"; }, () => {}, new AbortController().signal);
retryQueue.add(new Blob(["saved recording"]));
await assert.rejects(retryQueue.finish(), /TRANSCRIPTION_FAILED/);
assert.equal(await retryQueue.retry(), "Fahd", "retry reuses the failed recording");
const abortController = new AbortController();
let complete!: (text: string) => void;
let updates = 0;
const abortedQueue = new TranscriptionQueue(() => new Promise(resolve => { complete = resolve; }), () => { updates++; }, abortController.signal);
abortedQueue.add(new Blob(["audio"])); abortController.abort(); complete("late answer");
await assert.rejects(abortedQueue.finish());
assert.equal(updates, 0, "unmounted conversations ignore late transcripts");

// Run the actual AudioWorklet source, including the final non-full capture buffer.
let Worklet: new () => { process: (input: Float32Array[][]) => boolean; port: { onmessage: (event: { data: string }) => void } };
const captured: { frame?: Float32Array; stopped?: boolean }[] = [];
vm.runInNewContext(await readFile("public/voice-capture.js", "utf8"), {
  AudioWorkletProcessor: class { port = { onmessage: null, postMessage: (value: { frame?: Float32Array; stopped?: boolean }) => captured.push(value) }; },
  registerProcessor: (_: string, ctor: typeof Worklet) => { Worklet = ctor; }, Float32Array,
});
const worklet = new Worklet!();
for (let i = 0; i < 19; i++) worklet.process([[new Float32Array(128).fill(0.2)]]);
worklet.port.onmessage({ data: "stop" });
assert.equal(captured.filter(item => item.frame).reduce((n, item) => n + item.frame!.length, 0), 19 * 128);
assert.equal(captured.at(-1)?.stopped, true, "flush acknowledgement follows every sample");

// PCM arrives over arbitrary network boundaries, including half a sample.
const decoded: number[] = [];
let firstSound = 0;
const audioContext = {
  currentTime: 0, destination: {},
  createBuffer: (_: number, size: number, rate: number) => {
    const data = new Float32Array(size);
    return { duration: size / rate, getChannelData: () => data, data };
  },
  createBufferSource: () => {
    const source = { buffer: null as { data: Float32Array } | null, onended: null as (() => void) | null, connect() {}, disconnect() {}, stop() {}, start() { decoded.push(...source.buffer!.data); queueMicrotask(() => source.onended?.()); } };
    return source;
  },
} as unknown as AudioContext;
const stream = new ReadableStream({ start(output) { output.enqueue(new Uint8Array([0])); output.enqueue(new Uint8Array([128, 0, 0, 255])); output.enqueue(new Uint8Array([127])); output.close(); } });
await playPcm(new Response(stream, { headers: { "Content-Type": "audio/pcm", "X-Audio-Sample-Rate": "24000" } }), audioContext, new AbortController().signal, () => firstSound++);
assert.deepEqual(decoded, [-1, 0, 32767 / 32768]);
assert.equal(firstSound, 1);

const login = await createSession(new Request("http://localhost/api/session", { method: "POST", body: JSON.stringify({ role: "student" }) }));
const cookie = login.headers.get("set-cookie")!.split(";")[0];
const fakeFetch = globalThis.fetch;
const payloads: Record<string, unknown>[] = [];
globalThis.fetch = async (url, options) => {
  payloads.push(JSON.parse(options!.body as string));
  return String(url).endsWith("transcriptions")
    ? Response.json({ text: "Fahd et Hamza" })
    : new Response(new Uint8Array([0, 0, 1, 0]), { headers: { "Content-Type": "audio/pcm;rate=24000;channels=1" } });
};
try {
  for (const route of [transcribe, speech]) {
    assert.equal((await route(new Request("http://localhost/api/voice", { method: "POST" }))).status, 401);
    assert.equal((await route(new Request("http://localhost/api/voice", { method: "POST", headers: { cookie, origin: "https://elsewhere.invalid" } }))).status, 403);
  }
  const form = new FormData(); form.append("audio", new Blob(["mp4-test"], { type: "audio/mp4" }), "dictation.mp4"); form.append("lang", "fr");
  const transcript = await transcribe(new Request("http://localhost/api/transcribe", { method: "POST", headers: { cookie }, body: form }));
  assert.equal(transcript.status, 200);
  assert.equal((await transcript.json() as { text: string }).text, "Fahd et Hamza");
  assert.equal(payloads[0].model, "openai/gpt-4o-transcribe");
  assert.equal((payloads[0].input_audio as { format: string }).format, "m4a", "Safari MIME maps to a supported provider format");
  assert.match(JSON.stringify(payloads[0].provider), /Fahd/);
  const voice = await speech(new Request("http://localhost/api/speech", { method: "POST", headers: { cookie }, body: JSON.stringify({ text: "**Bonjour** Hamza.", lang: "fr" }) }));
  assert.equal(voice.status, 200);
  assert.equal(voice.headers.get("cache-control"), "no-store");
  assert.equal((await voice.arrayBuffer()).byteLength, 4);
  assert.equal(payloads[1].input, "Bonjour Hamza.");
  assert.equal(payloads[1].model, "google/gemini-3.8-flash-tts");
  assert.equal(payloads[1].voice, "Achird");
  assert.equal(payloads[1].response_format, "pcm");
  const invalid = await speech(new Request("http://localhost/api/speech", { method: "POST", headers: { cookie }, body: JSON.stringify({ text: "x".repeat(4501), lang: "fr" }) }));
  assert.equal(invalid.status, 400);
  assert.equal(payloads.length, 2, "rejected input never calls the paid provider");
} finally { globalThis.fetch = fakeFetch; }
const parentLogin = await createSession(new Request("http://localhost/api/session", { method: "POST", body: JSON.stringify({ role: "parent" }) }));
assert.equal(parentLogin.status, 200);
const parentCookie = parentLogin.headers.get("set-cookie")!.split(";")[0];
globalThis.fetch = async () => { throw new Error("ECONNREFUSED"); };
try {
  const failedChat = await chat(new Request("http://localhost/api/chat", { method: "POST", headers: { cookie: parentCookie }, body: JSON.stringify({ message: "Parle-moi de mon enfant Fahd", lang: "fr", age: 9, history: [] }) }));
  assert.equal(failedChat.status, 503);
  assert.equal((await failedChat.json() as { error: string }).error, "SCHOOL_UNAVAILABLE", "school failures must never be labelled as AI failures");
  const failedChild = await child(new Request("http://localhost/api/child", { headers: { cookie: parentCookie } }));
  assert.equal(failedChild.status, 503);
  assert.equal((await failedChild.json() as { error: string }).error, "SCHOOL_UNAVAILABLE", "school card must receive a readable error body");
} finally { globalThis.fetch = fakeFetch; }
assert.equal(speechText("**Bonjour** [Hamza](https://example.com)."), "Bonjour Hamza.");
assert.equal(speechText("FAHD et HAMZA progressent."), "Fahd et Hamza progressent.", "names in capitals are spoken as names, not acronyms");
console.log("PASS voice: silence, sample conservation, final word, double stop, request order, bounded concurrency, retry, cancellation, PCM streaming, auth, origin, provider contracts");
