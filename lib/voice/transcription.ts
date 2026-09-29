/** Transcribe during capture, with bounded concurrency and ordered results. */
export class TranscriptionQueue {
  private jobs: { audio: Blob; text?: string; failed: boolean }[] = [];
  private running = 0;
  private pending: number[] = [];
  private waiters: (() => void)[] = [];
  constructor(
    private transcribe: (audio: Blob, context: string) => Promise<string>,
    private update: (text: string) => void,
    private signal: AbortSignal,
  ) {}
  get text() { return this.jobs.map(job => job.text || "").filter(Boolean).join(" "); }
  get count() { return this.jobs.length; }
  add(audio: Blob) {
    if (this.signal.aborted) return;
    this.pending.push(this.jobs.length);
    this.jobs.push({ audio, failed: false });
    this.pump();
  }
  private pump() {
    if (this.signal.aborted) this.pending = [];
    while (!this.signal.aborted && this.running < 2 && this.pending.length) {
      const index = this.pending.shift()!;
      const job = this.jobs[index];
      this.running++;
      const context = this.jobs.slice(0, index).map(item => item.text || "").join(" ").slice(-600);
      void this.transcribe(job.audio, context).then(text => {
        if (this.signal.aborted) return;
        job.text = text;
        job.failed = false;
        this.update(this.text);
      }).catch(() => { job.failed = true; }).finally(() => { this.running--; this.pump(); });
    }
    if (!this.running && !this.pending.length) this.waiters.splice(0).forEach(resolve => resolve());
  }
  private async settle() {
    if (this.running || this.pending.length) await new Promise<void>(resolve => this.waiters.push(resolve));
    this.signal.throwIfAborted();
  }
  async finish() {
    await this.settle();
    if (this.jobs.some(job => job.failed)) throw new Error("TRANSCRIPTION_FAILED");
    return this.text;
  }
  async retry() {
    await this.settle();
    this.jobs.forEach((job, index) => { if (job.failed) this.pending.push(index); });
    this.pump();
    return this.finish();
  }
}
