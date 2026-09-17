"use client";
import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { FoxAvatar, AlexandreAvatar } from "./avatars";
import { ParentResponse } from "./parent-response";
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
  const [reading, setReading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [mountTime] = useState(() => formatTime(lang));
  const end = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const voiceStream = useRef<MediaStream | null>(null);
  const voiceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, busy]);
  useEffect(
    () => () => {
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
      if (voiceTimer.current) clearTimeout(voiceTimer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      voiceStream.current?.getTracks().forEach((track) => track.stop());
      if (audioCtxRef.current) void audioCtxRef.current.close();
    },
    [],
  );
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
    const analyser = analyserRef.current;
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
  }, [recording]);
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
  async function toggleRecording() {
    setVoiceError("");
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError(
        t(
          "Le micro n’est pas disponible dans ce navigateur.",
          "الميكروفون غير متاح في هذا المتصفح.",
        ),
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"].find(
        (candidate) => MediaRecorder.isTypeSupported(candidate),
      );
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      voiceStream.current = stream;
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        setRecording(false);
        if (voiceTimer.current) clearTimeout(voiceTimer.current);
        stream.getTracks().forEach((track) => track.stop());
        voiceStream.current = null;
        recorder.current = null;
        analyserRef.current = null;
        if (audioCtxRef.current) {
          void audioCtxRef.current.close();
          audioCtxRef.current = null;
        }
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
        if (blob.size < 200) return;
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, `alexandrebot.${blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "mp4" : "webm"}`);
          form.append("lang", lang);
          const response = await fetch("/api/transcribe", { method: "POST", body: form });
          const result = (await response.json()) as { text?: unknown };
          const transcript = typeof result.text === "string" ? result.text.trim() : "";
          if (!response.ok || !transcript)
            throw new Error();
          setDraft((current) => [current.trim(), transcript].filter(Boolean).join(" "));
        } catch {
          setVoiceError(
            t(
              "Je n’ai pas pu transcrire cette fois. Réessaie en parlant près du micro.",
              "تعذر تحويل الصوت هذه المرة. حاول مجدداً بالقرب من الميكروفون.",
            ),
          );
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorder.start();
      setRecording(true);
      voiceTimer.current = setTimeout(() => mediaRecorder.stop(), 45_000);
      try {
        const AudioCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtor) {
          const audioCtx = new AudioCtor();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          void audioCtx.resume().catch(() => {});
          audioCtxRef.current = audioCtx;
          analyserRef.current = analyser;
        }
      } catch {
        /* la visualisation est optionnelle, l'enregistrement continue */
      }
    } catch {
      setVoiceError(
        t(
          "Autorise le micro pour dicter ton message.",
          "اسمح باستعمال الميكروفون لإملاء رسالتك.",
        ),
      );
    }
  }
  function listen() {
    if (typeof speechSynthesis === "undefined") {
      setPhotoError(
        t(
          "La lecture audio n’est pas disponible dans ce navigateur.",
          "القراءة الصوتية غير متاحة في هذا المتصفح.",
        ),
      );
      return;
    }
    speechSynthesis.cancel();
    if (reading) {
      setReading(false);
      return;
    }
    const text =
      [...messages].reverse().find((m) => m.role === "assistant")?.content ||
      intro;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "ar" ? "ar-MA" : "fr-FR";
    utterance.rate = 0.9;
    utterance.onend = () => setReading(false);
    utterance.onerror = () => setReading(false);
    setReading(true);
    speechSynthesis.speak(utterance);
  }
  function submit() {
    if (busy || (!draft.trim() && !photo)) return;
    onSend(
      draft.trim() ||
        t("Aide-moi à comprendre cette image.", "ساعدني على فهم هذه الصورة."),
      photo,
    );
    setDraft("");
    setPhoto(undefined);
  }
  return (
    <section className="chat-card" aria-label={t("Conversation", "المحادثة")}>
      <div className="chat-heading">
        <div className={`mini-avatar ${role}`}>
          {role === "student" ? (
            <FoxAvatar speaking={busy} />
          ) : (
            <AlexandreAvatar speaking={busy} />
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
            className="icon-button"
            onClick={listen}
            title={t("Écouter / arrêter", "استماع / إيقاف")}
            aria-label={t("Écouter / arrêter", "استماع / إيقاف")}
          >
            {reading ? <VolumeX size={19} /> : <Volume2 size={19} />}
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
      {voiceError ? <p role="alert" className="voice-error">{voiceError}</p> : null}
      {contextHint && !photo ? (
        <div className="board-context-hint" role="status">
          <Sparkles size={14} />
          {contextHint}
        </div>
      ) : null}
      {recording ? (
        <div className="voice-visualizer" role="status">
          <span className="voice-dot" aria-hidden="true" />
          <canvas ref={canvasRef} aria-hidden="true" />
          <span className="voice-hint">
            {t(
              "Parle, puis clique sur Arrêter",
              "تحدّث، ثم اضغط على إيقاف",
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
              disabled={busy || transcribing}
              aria-label={t(
                recording ? "Arrêter la dictée" : "Dicter le message",
                recording ? "إيقاف الإملاء" : "إملاء الرسالة",
              )}
              title={t(
                recording ? "Arrêter la dictée" : "Dicter le message",
                recording ? "إيقاف الإملاء" : "إملاء الرسالة",
              )}
            >
              {transcribing ? (
                <LoaderCircle className="spin" size={20} />
              ) : recording ? (
                <CircleStop size={20} />
              ) : (
                <Mic size={20} />
              )}
              <span>
                {transcribing
                  ? t("Transcription…", "جارٍ التحويل…")
                  : recording
                    ? t("Arrêter", "إيقاف")
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
              disabled={!draft.trim() && !photo}
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
  );
}
