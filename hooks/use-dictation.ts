"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/contracts";
import { startVoiceCapture, type VoiceCapture } from "@/lib/voice/recorder";
import { TranscriptionQueue } from "@/lib/voice/transcription";

type Turn = { controller: AbortController; queue: TranscriptionQueue; capture?: VoiceCapture; timer?: ReturnType<typeof setTimeout>; stopping: boolean; retrying?: boolean };

export function useDictation(lang: Language, onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<"idle" | "starting" | "recording" | "sending" | "failed">("idle");
  const [partial, setPartial] = useState("");
  const [error, setError] = useState("");
  const turn = useRef<Turn | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const callback = useRef(onTranscript);
  useEffect(() => { callback.current = onTranscript; }, [onTranscript]);
  const cancel = useCallback(() => {
    const current = turn.current;
    turn.current = null;
    current?.controller.abort();
    current?.capture?.cancel();
    if (current?.timer) clearTimeout(current.timer);
    analyser.current = null;
  }, []);
  useEffect(() => {
    return cancel;
  }, [lang, cancel]);

  const complete = (current: Turn, text: string) => {
    if (turn.current !== current || current.controller.signal.aborted) return;
    if (!text.trim()) {
      setError(lang === "fr" ? "Je n’ai pas entendu de parole. Réessayez près du micro." : "لم أسمع كلاماً. حاول مجدداً بالقرب من الميكروفون.");
    } else {
      callback.current(text);
    }
    cancel();
    setStatus("idle");
    setPartial("");
  };

  const stop = async () => {
    const current = turn.current;
    if (!current || current.stopping || !current.capture) return;
    current.stopping = true;
    if (current.timer) clearTimeout(current.timer);
    setStatus("sending");
    try {
      await current.capture.stop();
      analyser.current = null;
      const text = await current.queue.finish();
      complete(current, text);
    } catch (reason) {
      if (current.controller.signal.aborted || turn.current !== current) return;
      if (reason instanceof Error && reason.message === "CAPTURE_INTERRUPTED") {
        cancel();
        setStatus("idle");
        setPartial("");
        setError(lang === "fr" ? "Le micro a été interrompu. Veuillez dicter à nouveau votre message." : "انقطع الميكروفون. يرجى إملاء رسالتك من جديد.");
        return;
      }
      // Keep the recording in memory for an explicit retry, never send partial speech.
      setStatus("failed");
      setError(lang === "fr" ? "La dictée n’a pas pu être envoyée. Réessayez avec le même enregistrement." : "تعذر إرسال الإملاء. حاول مجدداً بنفس التسجيل.");
    }
  };

  const start = async (autoStopOnSilence = false) => {
    if (turn.current && !turn.current.stopping) return;
    cancel();
    setError("");
    setPartial("");
    setStatus("starting");
    const controller = new AbortController();
    const current: Turn = {
      controller, stopping: false,
      queue: new TranscriptionQueue(async (audio, context) => {
        const form = new FormData();
        form.append("audio", audio, "dictation.wav");
        form.append("lang", lang);
        form.append("context", context);
        const response = await fetch("/api/transcribe", { method: "POST", body: form, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
        if (!response.ok) throw new Error("TRANSCRIPTION_FAILED");
        const result = await response.json() as { text?: unknown };
        if (typeof result.text !== "string") throw new Error("INVALID_TRANSCRIPT");
        return result.text.trim();
      }, text => {
        if (turn.current === current) setPartial(text);
      }, controller.signal),
    };
    turn.current = current;
    try {
      current.capture = await startVoiceCapture(
        audio => current.queue.add(audio),
        controller.signal,
        autoStopOnSilence ? () => void stop() : undefined,
      );
      if (controller.signal.aborted) { current.capture.cancel(); return; }
      analyser.current = current.capture.analyser;
      setStatus("recording");
      current.timer = setTimeout(() => void stop(), 60_000);
    } catch (reason) {
      if (controller.signal.aborted) return;
      cancel();
      setStatus("idle");
      setError(lang === "fr"
        ? reason instanceof Error && reason.message === "UNSUPPORTED" ? "Utilisez un navigateur récent pour dicter votre message." : "Autorisez le micro pour dicter votre message."
        : "اسمح باستعمال الميكروفون لإملاء رسالتك.");
    }
  };

  const retry = async () => {
    const current = turn.current;
    if (!current || current.retrying || status !== "failed") return;
    current.retrying = true;
    setStatus("sending");
    setError("");
    try { complete(current, await current.queue.retry()); }
    catch {
      if (current.controller.signal.aborted) return;
      setStatus("failed");
      setError(lang === "fr" ? "La transcription reste indisponible. Réessayez ou saisissez votre message." : "تحويل الصوت غير متاح حالياً. حاول مجدداً أو اكتب رسالتك.");
    }
    finally { current.retrying = false; }
  };
  const discard = () => { cancel(); setStatus("idle"); setPartial(""); setError(""); };
  return { status, partial, error, analyser, start, stop, retry, discard };
}
