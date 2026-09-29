/** Mono PCM WAV keeps browser capture independent of provider codec support. */
export function pcmToWav(samples: Float32Array, sampleRate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const label = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  label(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  label(8, "WAVE");
  label(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  label(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, value * (value < 0 ? 32768 : 32767), true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}

export function resample(samples: Float32Array, sourceRate: number, targetRate = 16000) {
  if (sourceRate === targetRate) return samples;
  const ratio = sourceRate / targetRate;
  const result = new Float32Array(Math.floor(samples.length / ratio));
  // Average each input interval; preserve duration on 44.1 and 48 kHz devices.
  for (let i = 0; i < result.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(samples.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
    let total = 0;
    for (let j = start; j < end; j++) total += samples[j];
    result[i] = total / (end - start);
  }
  return result;
}

/** Split only in silence: no mid-word cut, overlap, or guessed text deduplication. */
export class SpeechSegmenter {
  private frames: Float32Array[] = [];
  private length = 0;
  private voiced = 0;
  private silence = 0;
  constructor(
    private sampleRate: number,
    private emit: (samples: Float32Array) => void,
    private silenceSeconds = 0.5,
    private onSilence?: () => void,
  ) {}

  push(frame: Float32Array) {
    let energy = 0;
    for (const value of frame) energy += value * value;
    const speaking = Math.sqrt(energy / Math.max(1, frame.length)) >= 0.003;
    this.frames.push(frame);
    this.length += frame.length;
    if (speaking) {
      this.voiced += frame.length;
      this.silence = 0;
    } else {
      this.silence += frame.length;
    }
    if (this.voiced && this.silence >= this.sampleRate * this.silenceSeconds) {
      const hadSpeech = this.voiced >= this.sampleRate * 0.1;
      this.flush();
      if (hadSpeech) this.onSilence?.();
    }
    // Keep a short pre-roll, avoiding uploads and large buffers for silence.
    if (!this.voiced) {
      while (this.frames.length > 1 && this.length - this.frames[0].length > this.sampleRate * 0.18) {
        this.length -= this.frames.shift()!.length;
      }
    }
  }

  flush() {
    if (this.voiced >= this.sampleRate * 0.1) {
      const samples = new Float32Array(this.length);
      let offset = 0;
      for (const frame of this.frames) { samples.set(frame, offset); offset += frame.length; }
      this.emit(samples);
    }
    this.frames = [];
    this.length = this.voiced = this.silence = 0;
  }
}
