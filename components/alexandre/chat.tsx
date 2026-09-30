"use client";

import { useState } from "react";
import { LoaderCircle, Mic, RotateCcw, Square } from "lucide-react";
import { AlexandreAvatar, FoxAvatar } from "./avatars";
import { CallWaveform } from "./call-waveform";
import { useDictation } from "@/hooks/use-dictation";
import { useSpeech } from "@/hooks/use-speech";
import type { Language, Message, Role } from "@/lib/contracts";

export function Chat({
  role,
  lang,
  messages,
  busy,
  error,
  intro,
  onSend,
  onRetry,
  onCancel,
  contextHint,
}: {
  role: Role;
  lang: Language;
  messages: Message[];
  busy: boolean;
  error: string;
  intro: string;
  suggestions?: string[];
  onSend: (message: string, image?: string) => void;
  onRetry: () => void;
  onCancel: () => void;
  contextHint?: string;
}) {
  const t = (fr: string, ar: string) => (lang === "fr" ? fr : ar);
  const name = role === "student" ? "Milo" : "Alexandre";
  const [lastUtterance, setLastUtterance] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const dictation = useDictation(lang, transcript => {
    setLastUtterance(transcript);
    if (transcript.length > 2400) {
      setVoiceError(t("Votre question est trop longue. Reformulez-la en moins d'une minute.", "سؤالك طويل جدًا. أعد صياغته في أقل من دقيقة."));
      return;
    }
    onSend(transcript);
  });
  const recording = dictation.status === "recording";
  const starting = dictation.status === "starting";
  const transcribing = dictation.status === "sending";
  const microphoneBusy = starting || recording || transcribing;
  const lastReply = [...messages].reverse().find(message => message.role === "assistant") || { id: "intro", content: intro };
  const speech = useSpeech(lang, lastReply, busy || microphoneBusy);
  const avatarSpeaking = speech.status === "playing";
  const status = starting
    ? t("Ouverture du micro…", "جارٍ فتح الميكروفون…")
    : recording
      ? t("Je vous écoute", "أنا أستمع إليك")
      : transcribing
        ? t("Envoi de votre question…", "جارٍ إرسال سؤالك…")
        : busy
          ? t("Je prépare ma réponse…", "أحضّر الإجابة…")
          : speech.status === "loading"
            ? t("La voix arrive…", "الصوت قادم…")
            : avatarSpeaking
              ? t("Je vous réponds", "أجيبك الآن")
              : t("Touchez Parler pour poser votre question", "اضغط تحدّث لطرح سؤالك");

  function handleTalk() {
    if (recording) {
      void dictation.stop();
      return;
    }
    if (starting || transcribing) return;
    // A fresh gesture can interrupt both a pending answer and audio playback.
    if (busy) onCancel();
    speech.enableForCall();
    speech.stop();
    setVoiceError("");
    setLastUtterance("");
    void dictation.start(false);
  }

  const visibleError = dictation.error || speech.error || voiceError || (!microphoneBusy ? error : "");

  return (
    <section className={`chat-card voice-call-card ${role}`} aria-label={t(`Conversation vocale avec ${name}`, `محادثة صوتية مع ${name}`)} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <div className="voice-call-topline">
        <span className="avatar-call-live"><span aria-hidden="true" />{t("Conversation vocale", "محادثة صوتية")}</span>
        <span>{name}</span>
      </div>

      <div className="voice-call-main">
        <div className={`avatar-call-portrait ${avatarSpeaking ? "talking" : ""} ${recording ? "listening" : ""}`} aria-hidden="true">
          {role === "student" ? <FoxAvatar speaking={avatarSpeaking} /> : <AlexandreAvatar speaking={avatarSpeaking} />}
        </div>
        <h2>{name}</h2>
        <p className="voice-call-status" role="status" aria-live="polite">{status}</p>
        <div className="voice-call-signal">
          <CallWaveform
            analyser={recording ? dictation.analyser.current : avatarSpeaking ? speech.analyser.current : null}
            speaker={recording ? "parent" : avatarSpeaking ? "avatar" : "idle"}
            label={recording ? t("Niveau de votre voix", "مستوى صوتك") : avatarSpeaking ? t("Niveau de la voix de l'avatar", "مستوى صوت الشخصية") : t("Audio en attente", "الصوت في الانتظار")}
          />
          <span>{recording ? t("Votre voix", "صوتك") : avatarSpeaking ? t(`Voix de ${name}`, `صوت ${name}`) : "\u00a0"}</span>
        </div>

        {dictation.partial || lastUtterance ? (
          <p className="voice-call-transcript" dir="auto"><span>{t("Vous :", "أنت:")}</span> {dictation.partial || lastUtterance}</p>
        ) : (
          <p className="voice-call-hint">{t("Parlez naturellement, puis touchez Stop pour envoyer.", "تحدّث بشكل طبيعي، ثم اضغط إيقاف للإرسال.")}</p>
        )}
        {lastReply.id !== "intro" ? (
          <p className="voice-call-reply" dir="auto"><span>{name} :</span> {lastReply.content}</p>
        ) : null}
        {contextHint ? <p className="voice-call-context">{contextHint}</p> : null}
        {visibleError ? (
          <div className="voice-call-error" role="alert">
            <p>{visibleError}</p>
            {dictation.status === "failed" ? (
              <button type="button" onClick={() => void dictation.retry()}><RotateCcw size={15} />{t("Réessayer l'envoi", "إعادة محاولة الإرسال")}</button>
            ) : speech.error ? (
              <button type="button" onClick={speech.retry}><RotateCcw size={15} />{t("Réécouter", "إعادة الاستماع")}</button>
            ) : error && !microphoneBusy ? (
              <button type="button" onClick={onRetry}><RotateCcw size={15} />{t("Réessayer la réponse", "إعادة محاولة الإجابة")}</button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="voice-call-footer">
        <button
          type="button"
          className={`voice-call-button ${recording ? "is-recording" : ""}`}
          onClick={handleTalk}
          disabled={starting || transcribing}
          aria-busy={starting || transcribing}
          aria-label={recording ? t("Stop, envoyer la question", "إيقاف وإرسال السؤال") : t("Parler", "تحدّث")}
        >
          {starting || transcribing ? <LoaderCircle className="spin" size={23} /> : recording ? <Square size={21} fill="currentColor" /> : <Mic size={24} />}
          <span>{starting ? t("Micro…", "الميكروفون…") : transcribing ? t("Envoi…", "جارٍ الإرسال…") : recording ? t("Stop", "إيقاف") : t("Parler", "تحدّث")}</span>
        </button>
        <small>{t("60 secondes maximum par question", "60 ثانية كحد أقصى لكل سؤال")}</small>
      </div>
    </section>
  );
}
