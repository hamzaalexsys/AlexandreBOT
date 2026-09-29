"use client";
import { useEffect, useRef } from "react";

export function CallWaveform({ analyser, speaker, label }: {
  analyser: AnalyserNode | null;
  speaker: "parent" | "avatar" | "idle";
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const bands = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let frame = 0;
    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context.clearRect(0, 0, width, height);
      if (bands && analyser) analyser.getByteFrequencyData(bands);
      const count = 23;
      const gap = 4 * ratio;
      const barWidth = Math.max(2 * ratio, (width - gap * (count - 1)) / count);
      context.fillStyle = speaker === "avatar" ? "#ffd8a0" : "#bcecc3";
      for (let index = 0; index < count; index++) {
        const start = bands ? Math.floor((index / count) ** 1.3 * bands.length * .55) : 0;
        const end = bands ? Math.max(start + 1, Math.floor(((index + 1) / count) ** 1.3 * bands.length * .55)) : 0;
        let energy = 0;
        for (let bin = start; bin < end; bin++) energy += bands![bin];
        const level = bands ? Math.max(0, energy / (end - start) / 255 - .035) : 0;
        const barHeight = Math.max(4 * ratio, Math.min(height, (level ** .72) * height * 1.5));
        const x = index * (barWidth + gap);
        context.beginPath();
        context.roundRect(x, (height - barHeight) / 2, barWidth, barHeight, barWidth / 2);
        context.fill();
      }
      if (analyser) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [analyser, speaker]);

  return <canvas ref={canvasRef} className="avatar-call-waveform" role="img" aria-label={label} />;
}
