/** Schedule PCM as it arrives, including chunks split in the middle of a sample. */
export async function playPcm(response: Response, context: AudioContext, signal: AbortSignal, onPlaying: () => void, analyser?: AnalyserNode) {
  if (!response.body || !response.headers.get("content-type")?.includes("audio/pcm")) throw new Error("INVALID_AUDIO");
  const sampleRate = Number(response.headers.get("x-audio-sample-rate") || 24000);
  if (sampleRate !== 24000) throw new Error("INVALID_SAMPLE_RATE");
  const reader = response.body.getReader();
  const sources = new Set<AudioBufferSourceNode>();
  let carry = new Uint8Array(0);
  let nextTime = context.currentTime + 0.08;
  let began = false;
  let finished = false;
  let end: (() => void) | undefined;
  const abort = () => {
    void reader.cancel().catch(() => {});
    for (const source of sources) { source.onended = null; source.stop(); source.disconnect(); }
    sources.clear();
    end?.();
  };
  signal.addEventListener("abort", abort, { once: true });
  const schedule = (bytes: Uint8Array) => {
    const buffer = context.createBuffer(1, bytes.length / 2, sampleRate);
    const output = buffer.getChannelData(0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < output.length; i++) output[i] = view.getInt16(i * 2, true) / 32768;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser || context.destination);
    sources.add(source);
    source.onended = () => {
      source.disconnect();
      sources.delete(source);
      if (finished && !sources.size) end?.();
    };
    nextTime = Math.max(nextTime, context.currentTime + 0.025);
    source.start(nextTime);
    nextTime += buffer.duration;
    if (!began) { began = true; onPlaying(); }
  };
  try {
    signal.throwIfAborted();
    while (true) {
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      const bytes = new Uint8Array(carry.length + value.length);
      bytes.set(carry); bytes.set(value, carry.length);
      const aligned = bytes.length - bytes.length % 2;
      if (aligned >= 4096) { schedule(bytes.subarray(0, aligned)); carry = bytes.slice(aligned); }
      else carry = bytes;
    }
    if (carry.length % 2) throw new Error("TRUNCATED_AUDIO");
    if (carry.length) schedule(carry);
    if (!began) throw new Error("EMPTY_AUDIO");
    finished = true;
    if (sources.size) await new Promise<void>(resolve => { end = resolve; });
    signal.throwIfAborted();
  } catch (error) { abort(); throw error; }
  finally { signal.removeEventListener("abort", abort); reader.releaseLock(); }
}
