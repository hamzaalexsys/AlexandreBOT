import { pcmToWav, resample, SpeechSegmenter } from "./audio";

export type VoiceCapture = { analyser: AnalyserNode; stop: () => Promise<void>; cancel: () => void };

export async function startVoiceCapture(
  onChunk: (audio: Blob) => void,
  signal: AbortSignal,
  onSilence?: () => void,
): Promise<VoiceCapture> {
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) throw new Error("UNSUPPORTED");
  const context = new AudioContext();
  // Resume during the click gesture, before permission and module loading await.
  const resumed = context.resume();
  let stream: MediaStream | undefined;
  let node: AudioWorkletNode | undefined;
  let stopPromise: Promise<void> | undefined;
  let acknowledgeStop: (() => void) | undefined;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener("abort", cleanup);
    if (stopTimer) clearTimeout(stopTimer);
    stream?.getTracks().forEach(track => track.stop());
    node?.disconnect();
    if (context.state !== "closed") void context.close();
    acknowledgeStop?.();
  };
  signal.addEventListener("abort", cleanup, { once: true });
  try {
    await resumed;
    signal.throwIfAborted();
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (signal.aborted) { stream.getTracks().forEach(track => track.stop()); signal.throwIfAborted(); }
    await context.audioWorklet.addModule("/voice-capture.js");
    signal.throwIfAborted();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    node = new AudioWorkletNode(context, "voice-capture");
    const segmenter = new SpeechSegmenter(context.sampleRate, samples => {
      if (!signal.aborted) onChunk(pcmToWav(resample(samples, context.sampleRate), 16000));
    }, onSilence ? 1.25 : 0.5, onSilence);
    node.port.onmessage = ({ data }: MessageEvent<{ frame?: Float32Array; stopped?: boolean }>) => {
      if (disposed) return;
      if (data.frame) segmenter.push(data.frame);
      if (data.stopped) { segmenter.flush(); cleanup(); }
    };
    const mute = context.createGain();
    mute.gain.value = 0;
    source.connect(analyser);
    analyser.connect(mute);
    source.connect(node);
    node.connect(mute).connect(context.destination);
    return {
      analyser,
      cancel: cleanup,
      stop: () => {
        if (stopPromise) return stopPromise;
        if (disposed) return Promise.resolve();
        stopPromise = new Promise<void>((resolve, reject) => {
          acknowledgeStop = resolve;
          // A suspended device must never silently send an incomplete utterance.
          stopTimer = setTimeout(() => { acknowledgeStop = undefined; cleanup(); reject(new Error("CAPTURE_INTERRUPTED")); }, 1500);
          node!.port.postMessage("stop");
        });
        return stopPromise;
      },
    };
  } catch (error) { cleanup(); throw error; }
}
