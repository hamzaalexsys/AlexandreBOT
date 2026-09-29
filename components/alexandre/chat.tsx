"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Send,
  ImagePlus,
  Volume2,
  VolumeX,
  X,
  Square,
  Sparkles,
  RefreshCw,
  Mic,
  LoaderCircle,
  CircleStop,
  Settings,
  Bell,
  Leaf,
  User,
  CheckCheck,
  Database,
  Phone,
  PhoneOff,
  MicOff,
} from "lucide-react";
import { FoxAvatar, AlexandreAvatar } from "./avatars";
import { CallWaveform } from "./call-waveform";
import { ParentResponse } from "./parent-response";
import { useDictation } from "@/hooks/use-dictation";
import { useSpeech } from "@/hooks/use-speech";
import type { Language, Message, Role } from "@/lib/contracts";

const formatTime = (lang: Language) =>
  new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "ar-MA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

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
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<string>();
  const [photoError, setPhotoError] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [callMuted, setCallMuted] = useState(false);
  const [lastUtterance, setLastUtterance] = useState("");
  const callOpenRef = useRef(false);
  const callMutedRef = useRef(false);
  const hangupRef = useRef<HTMLButtonElement>(null);
  const endCallRef = useRef<() => void>(() => {});
  const [mountTime] = useState(() => formatTime(lang));
  const end = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dictation = useDictation(lang, (transcript) => {
    if (callOpenRef.current) setLastUtterance(transcript);
    const text = [draft.trim(), transcript].filter(Boolean).join(" ");
    if (text.length > 2400 || busy) {
      setDraft(text);
      setVoiceError(t("Le message est conservé. Raccourcissez-le si nécessaire, puis envoyez-le.", "تم الاحتفاظ بالرسالة. اختصرها عند الحاجة ثم أرسلها."));
      return;
    }
    onSend(text, photo);
    setDraft("");
    setPhoto(undefined);
  });
  const recording = dictation.status === "recording";
  const starting = dictation.status === "starting";
  const transcribing = dictation.status === "sending";
  const voiceBusy = recording || starting || transcribing;
  const lastReply = [...messages].reverse().find(m => m.role === "assistant") || { id: "intro", content: intro };
  const speech = useSpeech(lang, lastReply, busy || voiceBusy, () => {
    if (callOpenRef.current && !callMutedRef.current) void dictation.start(true);
  });
  function endCall() {
    callOpenRef.current = false;
    callMutedRef.current = false;
    dictation.discard();
    speech.disable();
    setCallOpen(false);
    setCallMuted(false);
  }
  endCallRef.current = endCall;
  function openCall() {
    if (busy || voiceBusy) return;
    setVoiceError("");
    setLastUtterance("");
    callOpenRef.current = true;
    callMutedRef.current = false;
    setCallOpen(true);
    setCallMuted(false);
    speech.enableForCall();
    void dictation.start(true);
  }
  function handleCallMicrophone() {
    if (recording) {
      callMutedRef.current = true;
      setCallMuted(true);
      void dictation.stop();
      return;
    }
    if (starting) {
      callMutedRef.current = true;
      setCallMuted(true);
      dictation.discard();
      return;
    }
    if (transcribing) return;
    if (busy) onCancel();
    speech.stop();
    callMutedRef.current = false;
    setCallMuted(false);
    setVoiceError("");
    void dictation.start(true);
  }
  useEffect(() => {
    if (!callOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    hangupRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") endCallRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [callOpen]);
  const callStatus = starting
      ? t("Ouverture du micro…", "جارٍ فتح الميكروفون…")
      : recording
        ? t("Je vous écoute", "أنا أستمع إليك")
        : transcribing
          ? t("Transcription en cours…", "جارٍ تحويل الكلام إلى نص…")
          : busy
            ? t("Je prépare ma réponse…", "أحضّر الإجابة…")
            : speech.status === "loading"
              ? t("La réponse arrive…", "الرد قادم…")
              : speech.status === "playing"
                ? t("Je vous réponds", "أجيبك الآن")
                : callMuted
                  ? t("Micro en pause. Touchez Parler pour reprendre.", "الميكروفون متوقف. اضغط تحدث للمتابعة.")
                  : t("Prêt à parler", "جاهز للمحادثة");
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, busy]);
  useEffect(() => {
    if (!recording) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    };
    resize();
    const analyser = dictation.analyser.current;
    const data = new Uint8Array(analyser ? analyser.frequencyBinCount : 64);
    const gradient = ctx2d.createLinearGradient(0, 0, 0, canvas.height || 1);
    gradient.addColorStop(0, "#8070c5");
    gradient.addColorStop(1, "#ffad72");
    let frame = 0;
    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);
      if (analyser) analyser.getByteFrequencyData(data);
      const bars = 44;
      const gap = 2 * dpr;
      const barWidth = Math.max(1, (w - gap * (bars - 1)) / bars);
      ctx2d.fillStyle = gradient;
      for (let i = 0; i < bars; i++) {
        const index = Math.floor((i / bars) * data.length);
        const value = data[index] / 255;
        const height = Math.max(2 * dpr, value * h * 0.94);
        ctx2d.fillRect(i * (barWidth + gap), (h - height) / 2, barWidth, height);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [recording, dictation.analyser]);
  async function attach(value: File | undefined) {
    if (!value) return;
    setPhotoError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(value.type) ||
      value.size > 8 * 1024 * 1024
    ) {
      setPhotoError(
        t(
          "Choisis une image JPG, PNG ou WebP de moins de 8 Mo.",
          "اختر صورة JPG أو PNG أو WebP أصغر من ٨ ميغابايت.",
        ),
      );
      return;
    }
    const url = URL.createObjectURL(value);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error();
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setPhoto(canvas.toDataURL("image/jpeg", 0.8));
    } catch {
      setPhotoError(
        t("Cette image ne peut pas être ouverte.", "تعذّر فتح الصورة."),
      );
    } finally {
      URL.revokeObjectURL(url);
      if (file.current) file.current.value = "";
    }
  }
  function toggleRecording() {
    setVoiceError("");
    if (recording) void dictation.stop();
    else {
      speech.stop();
      void dictation.start();
    }
  }
  function submit() {
    if (busy || voiceBusy || draft.length > 2400 || (!draft.trim() && !photo)) return;
    dictation.discard();
    speech.stop();
    onSend(
      draft.trim() ||
        t("Aide-moi à comprendre cette image.", "ساعدني على فهم هذه الصورة."),
      photo,
    );
    setDraft("");
    setPhoto(undefined);
  }
  return (
    <>
    <section className="chat-card" aria-label={t("Conversation", "المحادثة")}>
      <div className="chat-heading">
        <div className={`mini-avatar ${role}`}>
          {role === "student" ? (
            <FoxAvatar speaking={busy || speech.status === "playing"} />
          ) : (
            <AlexandreAvatar speaking={busy || speech.status === "playing"} />
          )}
        </div>
        <div>
          <strong>{role === "student" ? "Milo" : "Alexandre"}</strong>
          <small>
            {t(
              role === "student"
                ? "À ton écoute"
                : "Assistant scolaire · À votre écoute",
              role === "student"
                ? "هنا لمساعدتك"
                : "مساعد مدرسي · في خدمتكم",
            )}
          </small>
        </div>
        {role === "parent" ? (
          <span className="chat-badge">
            <Leaf size={13} />
            {t(
              "Des réponses fiables pour la réussite de votre enfant",
              "إجابات موثوقة لنجاح طفلكم",
            )}
          </span>
        ) : null}
        <div className="heading-actions">
          <span className="ghost-icon" aria-hidden="true">
            <Settings size={17} />
          </span>
          <span className="ghost-icon" aria-hidden="true">
            <Bell size={17} />
          </span>
          <button
            type="button"
            className="icon-button call-launch"
            onClick={openCall}
            disabled={busy || voiceBusy}
            aria-label={t("Démarrer un appel avec l’avatar", "بدء مكالمة مع الشخصية")}
          >
            <Phone size={18} />
            <span>{t("Appeler", "اتصال")}</span>
          </button>
          <button
            className="icon-button voice-listen"
            onClick={speech.toggle}
            aria-pressed={speech.enabled}
            title={t("Lire les réponses avec une voix de synthèse", "قراءة الإجابات بصوت اصطناعي")}
            aria-label={t(speech.enabled ? "Désactiver la lecture des réponses" : "Entendre les réponses", speech.enabled ? "إيقاف قراءة الإجابات" : "استماع للإجابات")}
          >
            {speech.status === "loading" ? <LoaderCircle className="spin" size={19} /> : speech.enabled ? <VolumeX size={19} /> : <Volume2 size={19} />}
            <span>{speech.enabled ? t("Son activé", "الصوت مفعّل") : t("Entendre", "استماع")}</span>
          </button>
        </div>
      </div>
      <div
        className="chat-messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="chat-day">
          <span>{t("Aujourd’hui", "اليوم")}</span>
        </div>
        <div className="message-block assistant">
          <div className="msg-row">
            <div className="msg-avatar" aria-hidden="true">
              {role === "student" ? <FoxAvatar /> : <AlexandreAvatar />}
            </div>
            <div className="bubble assistant">{intro}</div>
          </div>
          <p className="msg-time">{mountTime}</p>
        </div>
        {messages.map((m) => (
          <div key={m.id} className={`message-block ${m.role}`}>
            <div className={`msg-row ${m.role}`}>
              <div className="msg-avatar" aria-hidden="true">
                {m.role === "assistant" ? (
                  role === "student" ? (
                    <FoxAvatar />
                  ) : (
                    <AlexandreAvatar />
                  )
                ) : (
                  <span className="self-icon">
                    <User size={15} />
                  </span>
                )}
              </div>
              <div className={`bubble ${m.role}`} dir="auto">
                {m.content
                  .split(/(\*\*[^*\n]+\*\*)/g)
                  .map((part, index) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={index}>{part.slice(2, -2)}</strong>
                    ) : (
                      part
                    ),
                  )}
              </div>
            </div>
            <p className={`msg-time ${m.role}`}>
              {m.time || mountTime}
              {m.role === "user" ? <CheckCheck size={13} /> : null}
            </p>
            {role === "parent" && m.role === "assistant" && m.presentation ? (
              <ParentResponse presentation={m.presentation} lang={lang} />
            ) : null}
          </div>
        ))}
        {busy ? (
          <div className="message-block assistant">
            <div className="msg-row">
              <div className="msg-avatar" aria-hidden="true">
                {role === "student" ? <FoxAvatar /> : <AlexandreAvatar />}
              </div>
              <div className="thinking" role="status">
                <span />
                <span />
                <span />
                {t(
                  role === "student"
                    ? "Milo prépare sa réponse…"
                    : "Alexandre consulte les informations…",
                  role === "student"
                    ? "ميلو يجهّز الإجابة…"
                    : "ألكسندر يراجع المعلومات…",
                )}
              </div>
            </div>
            <p className="msg-time">{mountTime}</p>
          </div>
        ) : null}
        <div ref={end} />
      </div>
      {error ? (
        <div className="chat-error" role="alert">
          <p>{error}</p>
          <button onClick={onRetry}>
            <RefreshCw size={14} />
            {t("Réessayer", "إعادة المحاولة")}
          </button>
        </div>
      ) : null}
      {photo ? (
        <div className="photo-preview">
          {/* Resized local data URL preview; a remote image optimizer is unnecessary. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={t("Image à envoyer", "الصورة المرفقة")} />
          <span>{t("Prête à être expliquée", "جاهزة للشرح")}</span>
          <button
            onClick={() => setPhoto(undefined)}
            aria-label={t("Retirer la photo", "إزالة الصورة")}
          >
            <X size={17} />
          </button>
        </div>
      ) : null}
      {photoError ? (
        <p role="alert" className="chat-error">
          {photoError}
        </p>
      ) : null}
      {voiceError || dictation.error || speech.error ? <p role="alert" className="voice-error">{voiceError || dictation.error || speech.error}</p> : null}
      {dictation.status === "failed" ? (
        <div className="voice-recovery">
          <button type="button" onClick={() => void dictation.retry()} disabled={busy}><RefreshCw size={15} />{t("Réessayer l’envoi", "إعادة الإرسال")}</button>
          <button type="button" onClick={dictation.discard}>{t("Annuler la dictée", "إلغاء الإملاء")}</button>
        </div>
      ) : null}
      {(voiceBusy || dictation.status === "failed") && dictation.partial ? <p className="voice-transcript" dir="auto">{dictation.partial}</p> : null}
      {transcribing || starting ? <p className="voice-progress" role="status">{starting ? t("Ouverture du micro…", "جارٍ فتح الميكروفون…") : t("Envoi de votre message vocal…", "جارٍ إرسال رسالتك الصوتية…")}</p> : null}
      {contextHint && !photo ? (
        <div className="board-context-hint" role="status">
          <Sparkles size={14} />
          {contextHint}
        </div>
      ) : null}
      {recording && !callOpen ? (
        <div className="voice-visualizer" role="status">
          <span className="voice-dot" aria-hidden="true" />
          <canvas ref={canvasRef} aria-hidden="true" />
          <span className="voice-hint">
            {t(
              "Parlez, puis Stop pour envoyer · 60 s maximum",
              "تحدّث، ثم إيقاف للإرسال · ٦٠ ثانية كحد أقصى",
            )}
          </span>
        </div>
      ) : null}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="chat-message">
          {t(role === "student" ? "Ton message" : "Votre message", "رسالتك")}
        </label>
        <textarea
          id="chat-message"
          value={draft}
          disabled={voiceBusy}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2400}
          rows={2}
          placeholder={t(
            role === "student"
              ? "Milo, pourquoi… ?"
              : "Parlez-moi de mon enfant…",
            role === "student" ? "ميلو، لماذا…؟" : "حدّثني عن طفلي…",
          )}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="composer-tools">
          <div className="composer-actions">
            {role === "student" ? (
              <>
              <input
                ref={file}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => void attach(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={voiceBusy}
                onClick={() => file.current?.click()}
                aria-label={t(
                  "Ajouter une photo d’exercice",
                  "إضافة صورة تمرين",
                )}
              >
                <ImagePlus size={21} />
                <span>{t("Une photo", "صورة")}</span>
              </button>
              </>
            ) : (
              <span className="composer-privacy">
                <Database size={13} />
                {t("Base scolaire · Lecture seule", "قاعدة البيانات المدرسية · قراءة فقط")}
              </span>
            )}
            <button
              type="button"
              className={`voice-button ${recording ? "recording" : ""}`}
              onClick={() => void toggleRecording()}
              disabled={busy || transcribing || starting}
              aria-label={t(
                recording ? "Stop et envoyer" : "Dicter le message",
                recording ? "إيقاف الإملاء" : "إملاء الرسالة",
              )}
              title={t(
                recording ? "Stop et envoyer" : "Dicter le message",
                recording ? "إيقاف الإملاء" : "إملاء الرسالة",
              )}
            >
              {transcribing || starting ? (
                <LoaderCircle className="spin" size={20} />
              ) : recording ? (
                <CircleStop size={20} />
              ) : (
                <Mic size={20} />
              )}
              <span>
                {transcribing || starting
                  ? starting ? t("Micro…", "الميكروفون…") : t("Envoi…", "جارٍ الإرسال…")
                  : recording
                    ? t("Stop · envoyer", "إيقاف وإرسال")
                    : t("Dicter", "إملاء")}
              </span>
            </button>
          </div>
          {busy ? (
            <button
              type="button"
              className="send-button"
              onClick={onCancel}
              aria-label={t("Arrêter", "إيقاف")}
            >
              <Square size={17} />
            </button>
          ) : (
            <button
              className="send-button"
              type="submit"
              disabled={voiceBusy || draft.length > 2400 || (!draft.trim() && !photo)}
              aria-label={t("Envoyer", "إرسال")}
            >
              <Send size={19} />
            </button>
          )}
        </div>
      </form>
      <p className="chat-disclaimer">
        {t(
          role === "student"
            ? "Milo peut se tromper. On vérifie ensemble !"
            : "Les réponses de l’IA peuvent nécessiter une vérification auprès de l’école.",
          role === "student"
            ? "قد يخطئ ميلو. لنتحقق معاً!"
            : "قد تحتاج إجابات المساعد إلى تأكيد من المدرسة.",
        )}
      </p>
    </section>
    {callOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className={`avatar-call ${role}`}
            role="dialog"
            aria-modal="true"
            aria-label={t(`Appel avec ${role === "student" ? "Milo" : "Alexandre"}`, `مكالمة مع ${role === "student" ? "ميلو" : "ألكسندر"}`)}
            dir={lang === "ar" ? "rtl" : "ltr"}
            lang={lang}
          >
            <div className="avatar-call-inner">
              <div className="avatar-call-topline">
                <span className="avatar-call-live"><span aria-hidden="true" />{t("Conversation vocale", "محادثة صوتية")}</span>
                <span>{role === "student" ? "Milo" : "Alexandre"}</span>
              </div>
              <div className={`avatar-call-portrait ${speech.status === "playing" ? "talking" : ""} ${recording && !callMuted ? "listening" : ""}`}>
                {role === "student" ? (
                  <FoxAvatar speaking={speech.status === "playing"} />
                ) : (
                  <AlexandreAvatar speaking={speech.status === "playing"} />
                )}
              </div>
              <div className="avatar-call-content">
                <h2>{role === "student" ? "Milo" : "Alexandre"}</h2>
                <p className="avatar-call-status" role="status" aria-live="polite">{callStatus}</p>
                <div className="avatar-call-signal">
                  <CallWaveform
                    analyser={recording ? dictation.analyser.current : speech.status === "playing" ? speech.analyser.current : null}
                    speaker={recording ? "parent" : speech.status === "playing" ? "avatar" : "idle"}
                    label={recording ? t("Niveau de votre voix", "مستوى صوتك") : speech.status === "playing" ? t("Niveau de la voix de l’avatar", "مستوى صوت الشخصية") : t("Audio en attente", "الصوت في الانتظار")}
                  />
                  <span>{recording ? t("Votre voix", "صوتك") : speech.status === "playing" ? t("Voix d’Alexandre", "صوت ألكسندر") : ""}</span>
                </div>
                {dictation.partial || lastUtterance ? (
                  <p className="avatar-call-transcript" dir="auto">{dictation.partial || lastUtterance}</p>
                ) : (
                  <p className="avatar-call-hint">
                    {t("Parlez naturellement. Une pause enverra votre question.", "تحدث بطبيعية. ستُرسل سؤالك بعد توقف قصير.")}
                  </p>
                )}
                {lastReply.id !== "intro" ? <p className="avatar-call-reply" dir="auto">{lastReply.content}</p> : null}
                {voiceError || dictation.error || speech.error || error ? (
                  <div className="avatar-call-error" role="alert">
                    <p>{voiceError || dictation.error || speech.error || error}</p>
                    {dictation.status === "failed" ? (
                      <button type="button" onClick={() => void dictation.retry()}>{t("Réessayer la transcription", "إعادة تحويل الكلام")}</button>
                    ) : speech.error ? (
                      <button type="button" onClick={speech.retry}>{t("Réécouter la réponse", "إعادة سماع الرد")}</button>
                    ) : error ? (
                      <button type="button" onClick={onRetry}>{t("Réessayer la réponse", "إعادة المحاولة")}</button>
                    ) : dictation.status === "idle" && !callMuted ? (
                      <button type="button" onClick={handleCallMicrophone}>{t("Réessayer le micro", "إعادة تشغيل الميكروفون")}</button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="avatar-call-controls">
                <button type="button" className={`avatar-call-mute ${callMuted ? "is-muted" : ""}`} onClick={handleCallMicrophone} disabled={transcribing}>
                  {recording ? <MicOff size={23} /> : <Mic size={23} />}
                  <span>{recording ? t("Envoyer", "إرسال") : starting ? t("Couper le micro", "إيقاف الميكروفون") : transcribing ? t("Envoi…", "جارٍ الإرسال…") : t("Parler", "تحدث")}</span>
                </button>
                <button ref={hangupRef} type="button" className="avatar-call-end" onClick={endCall}>
                  <PhoneOff size={23} />
                  <span>{t("Terminer", "إنهاء")}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null}
    </>
  );
}
