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
} from "lucide-react";
import { FoxAvatar, AlexandreAvatar } from "./avatars";
import type { Language, Message, Role } from "@/lib/contracts";
export function Chat({
  role,
  lang,
  messages,
  busy,
  error,
  intro,
  suggestions,
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
  suggestions: string[];
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
  const end = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, busy]);
  useEffect(
    () => () => {
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    },
    [],
  );
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
            <i />
            {t(
              role === "student" ? "À ton écoute" : "À votre écoute",
              "هنا لمساعدتك",
            )}
          </small>
        </div>
        <button
          className="icon-button"
          onClick={listen}
          title={t("Écouter / arrêter", "استماع / إيقاف")}
          aria-label={t("Écouter / arrêter", "استماع / إيقاف")}
        >
          {reading ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
      </div>
      <div
        className="chat-messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="bubble assistant">{intro}</div>
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`} dir="auto">
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
        ))}
        {busy ? (
          <div className="thinking" role="status">
            <span />
            <span />
            <span />
            {t(
              role === "student"
                ? "Milo prépare sa réponse…"
                : "Alexandre consulte le dossier…",
              role === "student"
                ? "ميلو يجهّز الإجابة…"
                : "ألكسندر يراجع الملف…",
            )}
          </div>
        ) : null}
        <div ref={end} />
      </div>
      {!busy && suggestions.length ? (
        <div className="chat-suggestions">
          {suggestions.map((s) => (
            <button key={s} onClick={() => onSend(s)}>
              <Sparkles size={13} />
              {s}
            </button>
          ))}
        </div>
      ) : null}
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
      {contextHint && !photo ? (
        <div className="board-context-hint" role="status">
          <Sparkles size={14} />
          {contextHint}
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
              {t(
                "Base scolaire · Lecture seule",
                "قاعدة البيانات المدرسية · قراءة فقط",
              )}
            </span>
          )}
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
