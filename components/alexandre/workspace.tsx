"use client";
import { useCallback, useState } from "react";
import { Globe2, LogOut, Heart, MessageCircle, RotateCcw } from "lucide-react";
import { StudentWorkspace } from "./student-workspace";
import { ParentOverview } from "./parent-overview";
import { Chat } from "./chat";
import { useConversation } from "@/hooks/use-conversation";
import type { Language, Role, Reply } from "@/lib/contracts";
import { parentFocusFor, type ParentFocus } from "@/lib/parent-focus";
type Props = {
  role: Role;
  lang: Language;
  setLang: (lang: Language) => void;
  onExit: () => void;
};
export function Workspace(props: Props) {
  return props.role === "student" ? (
    <StudentWorkspace {...props} />
  ) : (
    <ParentWorkspace {...props} />
  );
}
function ParentWorkspace({ lang, setLang, onExit }: Props) {
  const t = (fr: string, ar: string) => (lang === "fr" ? fr : ar);
  const [view, setView] = useState("activity");
  const [focus, setFocus] = useState<ParentFocus>("summary");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const onReply = useCallback(
    (reply: Reply) => setSuggestions(reply.suggestions),
    [],
  );
  const chat = useConversation({ role: "parent", lang, age: 9, onReply });
  function ask(text: string) {
    setFocus(parentFocusFor(text));
    setView("chat");
    void chat.send(text);
  }
  return (
    <div
      className="parent-shell"
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
    >
      <header className="child-header">
        <div className="child-brand">
          <span className="brand-symbol">
            a<span>✦</span>
          </span>
          <div>
            <strong>
              Alexandre<span>BOT</span>
            </strong>
            <small>
              {t("Groupe scolaire Alexandre", "مجموعة مدارس ألكسندر")}
            </small>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="language-button"
            disabled={chat.busy}
            onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
          >
            <Globe2 size={18} />
            {lang === "fr" ? "العربية" : "Français"}
          </button>
          <button
            className="exit-circle"
            onClick={onExit}
            aria-label={t("Changer d’espace", "تغيير الفضاء")}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
      <main className="parent-main">
        <div className="parent-title">
          <div>
            <span className="little-label">
              {t("L’ESPACE FAMILLE", "فضاء العائلة")}
            </span>
            <h1>
              {t("Un lien plus proche avec l’école.", "صلة أقرب مع المدرسة.")}
            </h1>
          </div>
          <span className="demo-chip">
            {t("Pilote local · lecture seule", "نسخة محلية · قراءة فقط")}
          </span>
        </div>
        <div className="mobile-tabs">
          <button
            className={view === "activity" ? "active" : ""}
            onClick={() => setView("activity")}
          >
            <Heart size={18} />
            {t("Mon enfant", "طفلي")}
          </button>
          <button
            className={view === "chat" ? "active" : ""}
            onClick={() => setView("chat")}
          >
            <MessageCircle size={18} />
            {t("Alexandre", "ألكسندر")}
          </button>
        </div>
        <div className={`parent-grid view-${view}`}>
          <div className="activity-column">
            <ParentOverview
              lang={lang}
              onAsk={ask}
              busy={chat.busy}
              focus={focus}
            />
          </div>
          <div className="conversation-column">
            <Chat
              role="parent"
              lang={lang}
              messages={chat.messages}
              busy={chat.busy}
              error={chat.error}
              intro={t(
                "Bonjour, je suis Alexandre. Je vous aide à comprendre les informations scolaires disponibles pour votre enfant. Les données sont consultées en lecture seule. Que souhaitez-vous savoir ?",
                "مرحباً، أنا ألكسندر. أساعدكم على فهم المعلومات المدرسية المتاحة لطفلكم. تتم قراءة البيانات فقط. ماذا تودّون معرفته؟",
              )}
              suggestions={
                suggestions.length
                  ? suggestions
                  : [
                      t("Comment va mon enfant ?", "كيف حال طفلي؟"),
                      t(
                        "Comment l’aider à la maison ?",
                        "كيف أساعده في البيت؟",
                      ),
                    ]
              }
              onSend={ask}
              onRetry={chat.retry}
              onCancel={chat.cancel}
            />
            <button
              className="new-conversation"
              disabled={chat.busy}
              onClick={() => {
                chat.reset();
                setSuggestions([]);
                setFocus("summary");
              }}
            >
              <RotateCcw size={15} />
              {t("Nouvelle conversation", "محادثة جديدة")}
            </button>
          </div>
        </div>
      </main>
      <footer className="child-footer">
        {t(
          "Groupe scolaire Alexandre · Grandir ensemble, chaque jour.",
          "مجموعة مدارس ألكسندر · نكبر معاً، كل يوم.",
        )}
      </footer>
    </div>
  );
}
