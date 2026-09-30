"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/contracts";
import { playPcm } from "@/lib/voice/playback";

export function useSpeech(
  lang: Language,
  message: { id: string; content: string },
  blocked: boolean,
  onFinished?: () => void,
) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "playing">("idle");
  const [error, setError] = useState("");
  const context = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const request = useRef<AbortController | null>(null);
  const spoken = useRef("");
  const finished = useRef(onFinished);
  useEffect(() => { finished.current = onFinished; }, [onFinished]);
  const stop = useCallback(() => {
    request.current?.abort();
    request.current = null;
    setStatus("idle");
    setError("");
  }, []);
  const speak = useCallback(async (text: string) => {
    stop();
    const controller = new AbortController();
    request.current = controller;
    setStatus("loading");
    setError("");
    try {
      const audioContext = context.current;
      if (!audioContext) throw new Error("AUDIO_UNAVAILABLE");
      await audioContext.resume();
      controller.signal.throwIfAborted();
      const response = await fetch("/api/speech", {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }),
      });
      if (!response.ok) throw new Error("SPEECH_FAILED");
      await playPcm(response, audioContext, controller.signal, () => setStatus("playing"), analyser.current || undefined);
      if (!controller.signal.aborted) finished.current?.();
    } catch {
      if (!controller.signal.aborted) {
        setError(lang === "fr" ? "La lecture vocale n’a pas abouti. Touchez Réécouter pour réessayer." : "تعذرت القراءة الصوتية. اضغط على إعادة الاستماع للمحاولة مجدداً.");
        setEnabled(false);
      }
    } finally {
      if (request.current === controller) { request.current = null; setStatus("idle"); }
    }
  }, [lang, stop]);
  useEffect(() => {
    // Synchronize the external audio player with arriving replies and mic activity.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (blocked) { stop(); return; }
    if (enabled && spoken.current !== message.id) {
      spoken.current = message.id;
      void speak(message.content);
    }
  }, [blocked, enabled, message.id, message.content, speak, stop]);
  useEffect(() => () => {
    request.current?.abort();
    if (context.current && context.current.state !== "closed") void context.current.close();
    context.current = null;
    analyser.current = null;
  }, [lang]);
  const unlock = () => {
    context.current ??= new AudioContext();
    if (!analyser.current) {
      analyser.current = context.current.createAnalyser();
      analyser.current.fftSize = 512;
      analyser.current.smoothingTimeConstant = .72;
      analyser.current.connect(context.current.destination);
    }
    void context.current.resume().catch(() => {});
  };
  const toggle = () => {
    if (enabled) { setEnabled(false); stop(); return; }
    try {
      unlock();
      // Unlock on the click so future replies can play without a second gesture.
      spoken.current = message.id;
      setEnabled(true);
      setError("");
      if (!blocked) void speak(message.content);
    } catch {
      setError(lang === "fr" ? "La lecture audio n’est pas disponible dans ce navigateur." : "القراءة الصوتية غير متاحة في هذا المتصفح.");
    }
  };
  const enableForCall = () => {
    try {
      unlock();
      stop();
      spoken.current = message.id;
      setEnabled(true);
      setError("");
      return true;
    } catch {
      setError(lang === "fr" ? "La lecture audio n’est pas disponible dans ce navigateur." : "القراءة الصوتية غير متاحة في هذا المتصفح.");
      return false;
    }
  };
  const disable = () => { setEnabled(false); stop(); };
  const retry = () => {
    if (!enableForCall()) return;
    void speak(message.content);
  };
  return { enabled, status, error, analyser, toggle, stop, enableForCall, disable, retry };
}
