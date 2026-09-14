"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  replySchema,
  type ChildDrawingContext,
  type Language,
  type Message,
  type Reply,
  type Role,
  type Scene,
} from "@/lib/contracts";
export function useConversation({
  role,
  lang,
  scene,
  age,
  onReply,
}: {
  role: Role;
  lang: Language;
  scene?: Scene;
  age: number;
  onReply: (reply: Reply) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const pending = useRef<{
    message: string;
    image?: string;
    selected?: string;
    childDrawing?: ChildDrawingContext;
  } | null>(null);
  const state = useRef({ messages, role, lang, scene, age, onReply });
  useEffect(() => {
    state.current = { messages, role, lang, scene, age, onReply };
  }, [messages, role, lang, scene, age, onReply]);
  useEffect(() => () => controller.current?.abort(), []);
  const send = useCallback(
    async (
      message: string,
      image?: string,
      selected?: string,
      childDrawing?: ChildDrawingContext,
      retry = false,
    ) => {
      if (controller.current || !message.trim()) return;
      const current = state.current;
      const abort = new AbortController();
      controller.current = abort;
      setBusy(true);
      setError("");
      pending.current = { message, image, selected, childDrawing };
      if (!retry)
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "user", content: message },
        ]);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          signal: abort.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            lang: current.lang,
            age: current.age,
            history: (retry ? current.messages.slice(0, -1) : current.messages)
              .slice(-12)
              .map((m) => ({ role: m.role, content: m.content })),
            ...(current.role === "student"
              ? { scene: current.scene, selected, image, childDrawing }
              : {}),
          }),
        });
        if (!response.ok) {
          if (response.status === 401) throw new Error("SESSION");
          if (response.status === 429) throw new Error("LIMIT");
          throw new Error("PROVIDER");
        }
        const raw = await response.json();
        const parsed = replySchema.safeParse(raw);
        if (!parsed.success) {
          console.error(
            "CHAT_RESPONSE_INVALID",
            parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              code: issue.code,
            })),
          );
          throw new Error("INVALID_RESPONSE");
        }
        const wire = raw as { source?: unknown; toolNames?: unknown };
        const reply: Reply = {
          ...parsed.data,
          source: wire.source === "guided" ? "guided" : "openrouter",
          toolNames: Array.isArray(wire.toolNames)
            ? wire.toolNames.filter(
                (name): name is string => typeof name === "string",
              )
            : [],
        };
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: reply.message,
          },
        ]);
        current.onReply(reply);
        pending.current = null;
      } catch (e) {
        if (abort.signal.aborted) return;
        const reason = e instanceof Error ? e.message : "";
        const fr =
          reason === "SESSION"
            ? "Ta session a expiré. Reviens à l’accueil pour te reconnecter."
            : reason === "LIMIT"
              ? "Une petite pause : réessaie dans une minute."
              : "La réponse n’est pas arrivée. Tu peux réessayer, le tableau reste disponible.";
        const ar =
          reason === "SESSION"
            ? "انتهت الجلسة. عد إلى الصفحة الرئيسية للدخول مجدداً."
            : reason === "LIMIT"
              ? "استراحة قصيرة: حاول بعد دقيقة."
              : "لم تصل الإجابة. يمكنك المحاولة مجدداً، واللوحة ما زالت متاحة.";
        setError(current.lang === "fr" ? fr : ar);
      } finally {
        controller.current = null;
        setBusy(false);
      }
    },
    [],
  );
  const retry = () => {
    const p = pending.current;
    if (p) void send(p.message, p.image, p.selected, p.childDrawing, true);
  };
  const cancel = () => {
    controller.current?.abort();
    setError(
      state.current.lang === "fr"
        ? "Réponse arrêtée. Tu peux réessayer."
        : "توقّفت الإجابة. يمكنك المحاولة مجدداً.",
    );
  };
  const reset = () => {
    controller.current?.abort();
    pending.current = null;
    setMessages([]);
    setError("");
  };
  return { messages, busy, error, send, retry, cancel, reset };
}
