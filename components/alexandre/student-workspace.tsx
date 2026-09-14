"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Globe2,
  LogOut,
  MessageCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  type Language,
  type ChildDrawingContext,
  type Reply,
  type Scene,
  type Simulation,
} from "@/lib/contracts";
import { applyBoardReply } from "@/lib/notebook";
import { useNotebook } from "@/hooks/use-notebook";
import { useConversation } from "@/hooks/use-conversation";
import {
  Board,
  type BoardHandle,
} from "./board";
import { Chat } from "./chat";
import { FoxAvatar } from "./avatars";
import { Sticker } from "./stickers";
function initialScene(lang: Language): Scene {
  return {
    id: "blank-entry",
    title: lang === "fr" ? "Ton tableau est prêt" : "لوحتك جاهزة",
    subtitle:
      lang === "fr"
        ? "Pose une question à Milo ou dessine quelque chose."
        : "اسأل ميلو أو ارسم شيئاً.",
    shapes: [],
    simulation: null,
  };
}
export function StudentWorkspace({
  lang,
  setLang,
  onExit,
}: {
  lang: Language;
  setLang: (l: Language) => void;
  onExit: () => void;
}) {
  const t = (fr: string, ar: string) => (lang === "fr" ? fr : ar);
  const { book, setBook, saved } = useNotebook(() => initialScene(lang));
  const [age, setAge] = useState(9);
  const [view, setView] = useState<"activity" | "chat">("activity");
  const [answered, setAnswered] = useState<{
    key: string;
    value: number;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [newDrawing, setNewDrawing] = useState(false);
  const boardRef = useRef<BoardHandle>(null);
  const sendLock = useRef(false);
  const page = book.pages[book.index];
  const quiz = page.quiz || null;
  const quizKey = `${page.createdAt}-${quiz?.question}`;
  const answer = answered?.key === quizKey ? answered.value : null;
  const setAnswer = (value: number) => setAnswered({ key: quizKey, value });
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  const onReply = useCallback(
    (reply: Reply) => {
      setBook((current) => {
        const next = applyBoardReply(current, reply);
        return reply.quiz
          ? {
              ...next,
              pages: next.pages.map((p, i) =>
                i === next.index ? { ...p, quiz: reply.quiz } : p,
              ),
            }
          : next;
      });
      if (reply.scene && reply.boardAction !== "keep") setNewDrawing(true);
      if (reply.quiz) setAnswered(null);
      setSuggestions(reply.suggestions);
    },
    [setBook],
  );
  const chat = useConversation({
    role: "student",
    lang,
    scene: page.scene,
    age,
    onReply,
  });
  const actions = useRef({ busy: chat.busy, book, lang });
  useEffect(() => {
    actions.current = { busy: chat.busy, book, lang };
  }, [chat.busy, book, lang]);
  function ask(
    message: string,
    image?: string,
    selected?: string,
    childDrawing?: ChildDrawingContext,
  ) {
    if (sendLock.current || chat.busy) return;
    setView("chat");
    sendLock.current = true;
    void (async () => {
      try {
        let outgoingImage = image;
        let drawing = childDrawing;
        if (!outgoingImage && page.strokes.length) {
          outgoingImage = await boardRef.current?.capture();
          drawing = { strokeCount: page.strokes.length };
        }
        await chat.send(message, outgoingImage, selected, drawing);
      } finally {
        sendLock.current = false;
      }
    })();
  }
  function changeScene(scene: Scene) {
    setBook((current) => ({
      ...current,
      pages: current.pages.map((p, i) =>
        i === current.index ? { ...p, scene } : p,
      ),
    }));
  }
  function explore(type: Simulation["type"]) {
    const names = {
      bounce: t("Le ballon rebondissant", "الكرة المرتدّة"),
      orbit: t("Voyage dans l’espace", "رحلة في الفضاء"),
      water: t("Le voyage de l’eau", "رحلة الماء"),
      fractions: t("Une pizza à partager", "بيتزا للمشاركة"),
      pendulum: t("La balançoire curieuse", "الأرجوحة الفضولية"),
    };
    const scene: Scene = {
      id: `${type}-${crypto.randomUUID().slice(0, 8)}`,
      title: names[type],
      subtitle: t(
        "Touche, observe, pose tes questions !",
        "المس، لاحظ، واطرح أسئلتك!",
      ),
      shapes: [],
      simulation: { type },
    };
    setBook((current) =>
      applyBoardReply(current, {
        scene,
        boardAction: "new",
        removeShapeIds: [],
      }),
    );
    setAnswered(null);
    setView("activity");
  }
  // Page-local tools use the same notebook state. Unsupported browsers simply skip registration.
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => Promise<void> | void;
        };
      }
    ).modelContext;
    if (!context) return;
    const life = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "open_notebook_page",
            description:
              "Return to an existing page in Milo's local notebook without clearing or changing it. Page is one-based.",
            inputSchema: {
              type: "object",
              properties: { page: { type: "integer", minimum: 1 } },
              required: ["page"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute: (input: unknown) => {
              const n = (input as { page?: number })?.page;
              const state = actions.current;
              if (
                typeof n !== "number" ||
                !Number.isInteger(n) ||
                n < 1 ||
                n > state.book.pages.length ||
                state.busy
              )
                throw new Error("Invalid page or busy");
              setBook((b) => ({ ...b, index: n! - 1 }));
              setView("activity");
              return { page: n, title: state.book.pages[n! - 1].scene.title };
            },
          },
          { signal: life.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => life.abort();
  }, [setBook]);
  const correct = !!quiz && answer === quiz.correctIndex;
  return (
    <div
      className="child-shell"
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
              {t("L’atelier des petits curieux", "ورشة الفضوليين الصغار")}
            </small>
          </div>
        </div>
        <div className="header-actions">
          <span className="demo-chip">{t("Démo", "تجربة")}</span>
          <button
            className="language-button"
            onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
            disabled={chat.busy}
          >
            <Globe2 size={17} />
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
      <main className="child-main">
        <section className="milo-welcome">
          <div className="welcome-fox">
            <FoxAvatar speaking={chat.busy} happy={correct} />
            <span className="fox-sticker">{t("Coucou !", "أهلاً!")}</span>
          </div>
          <div className="milo-welcome-copy">
            <span className="little-label">
              {t(
                "TOI + MILO = PLEIN DE DÉCOUVERTES",
                "أنت + ميلو = اكتشافات كثيرة",
              )}
            </span>
            <h1>
              {t("Les grandes questions", "الأسئلة الكبيرة")}
              <br />
              <span>{t("commencent avec toi.", "تبدأ بك.")}</span>
            </h1>
            <p>
              {t(
                "On dessine, on essaie, on comprend. Qu’est-ce qui t’intrigue ?",
                "نرسم، نجرّب، نفهم. ما الذي يثير فضولك؟",
              )}
            </p>
          </div>
          <div className="welcome-decoration">
            <svg viewBox="0 0 160 150" aria-hidden="true">
              <g transform="translate(85 65) rotate(12) scale(.85)">
                <Sticker kind="rocket" />
              </g>
              <g transform="translate(28 39) scale(.3)">
                <Sticker kind="star" />
              </g>
              <g transform="translate(128 117) scale(.25)">
                <Sticker kind="star" />
              </g>
              <path
                d="M56 124Q12 137 30 93"
                stroke="#c1b5e3"
                strokeWidth="2"
                strokeDasharray="5 7"
                fill="none"
              />
            </svg>
          </div>
        </section>
        <div className="explore-strip">
          <span>{t("Une idée pour commencer ?", "فكرة لنبدأ؟")}</span>
          <div>
            {(
              [
                {
                  type: "bounce",
                  sticker: "ball",
                  fr: "Ça rebondit !",
                  ar: "ترتدّ!",
                },
                {
                  type: "orbit",
                  sticker: "rocket",
                  fr: "Dans l’espace",
                  ar: "في الفضاء",
                },
                {
                  type: "water",
                  sticker: "water",
                  fr: "Une goutte d’eau",
                  ar: "قطرة ماء",
                },
                {
                  type: "fractions",
                  sticker: "star",
                  fr: "On partage ?",
                  ar: "لنقتسم؟",
                },
                {
                  type: "pendulum",
                  sticker: "cat",
                  fr: "Ça se balance !",
                  ar: "تتأرجح!",
                },
              ] as const
            ).map((item) => (
              <button
                key={item.type}
                disabled={chat.busy}
                onClick={() => explore(item.type)}
              >
                <svg viewBox="-65 -65 130 130" aria-hidden="true">
                  <Sticker kind={item.sticker} />
                </svg>
                {t(item.fr, item.ar)}
              </button>
            ))}
          </div>
        </div>
        <div className="mobile-tabs">
          <button
            className={view === "activity" ? "active" : ""}
            onClick={() => {
              setView("activity");
              setNewDrawing(false);
            }}
          >
            <BookOpen size={18} />
            {t("Mon tableau", "لوحتي")}
            {newDrawing ? <span className="new-dot" /> : null}
          </button>
          <button
            className={view === "chat" ? "active" : ""}
            onClick={() => setView("chat")}
          >
            <MessageCircle size={18} />
            {t("Parler à Milo", "التحدث إلى ميلو")}
          </button>
        </div>
        <div className={`child-grid view-${view}`}>
          <div className="activity-column">
            <div className="notebook-bar">
              <div>
                <BookOpen size={17} />
                <strong>
                  {t("Mon carnet de découvertes", "دفتر اكتشافاتي")}
                </strong>
              </div>
              <span>
                {book.index + 1} / {book.pages.length}
              </span>
              <button
                disabled={chat.busy || book.index === 0}
                onClick={() => setBook((b) => ({ ...b, index: b.index - 1 }))}
                aria-label={t("Tableau précédent", "اللوحة السابقة")}
              >
                <ArrowLeft size={18} />
              </button>
              <button
                disabled={chat.busy || book.index === book.pages.length - 1}
                onClick={() => setBook((b) => ({ ...b, index: b.index + 1 }))}
                aria-label={t("Tableau suivant", "اللوحة التالية")}
              >
                <ArrowRight size={18} />
              </button>
            </div>
            {book.pages.length > 1 ? (
              <div className="notebook-pages">
                {book.pages.map((p, i) => (
                  <button
                    key={`${p.createdAt}-${i}`}
                    disabled={chat.busy}
                    className={i === book.index ? "active" : ""}
                    onClick={() => {
                      setBook((b) => ({ ...b, index: i }));
                      setNewDrawing(false);
                    }}
                  >
                    {i + 1}. {p.scene.title}
                  </button>
                ))}
              </div>
            ) : null}
            <Board
              ref={boardRef}
              key={page.createdAt}
              scene={page.scene}
              strokes={page.strokes}
              onStrokes={(strokes) =>
                setBook((b) => ({
                  ...b,
                  pages: b.pages.map((p, i) =>
                    i === b.index ? { ...p, strokes } : p,
                  ),
                }))
              }
              onChange={changeScene}
              onAsk={ask}
              lang={lang}
              busy={chat.busy}
            />
            {quiz ? (
              <section className={`quiz-card ${correct ? "quiz-success" : ""}`}>
                <span className="quiz-star">✦</span>
                <div>
                  <span className="little-label">
                    {t("À TOI DE JOUER", "حان دورك")}
                  </span>
                  <h3>{quiz.question}</h3>
                  <div className="quiz-options">
                    {quiz.options.map((option, i) => (
                      <button
                        disabled={correct}
                        key={`${option}-${i}`}
                        className={
                          answer === i
                            ? correct
                              ? "correct"
                              : "incorrect"
                            : ""
                        }
                        onClick={() => setAnswer(i)}
                      >
                        {correct && answer === i ? <Check size={19} /> : null}
                        {option}
                      </button>
                    ))}
                  </div>
                  {answer !== null ? (
                    <p role="status">
                      {correct
                        ? quiz.explanation
                        : t(
                            "Essaie encore. Une erreur, c’est aussi une façon d’apprendre !",
                            "حاول مجدداً. الخطأ أيضاً طريقة للتعلّم!",
                          )}
                    </p>
                  ) : null}
                  <button
                    className="text-link"
                    disabled={chat.busy}
                    onClick={() =>
                      ask(
                        `${t("Donne-moi un indice pour : ", "أعطني تلميحاً عن: ")}${quiz.question} ${quiz.options.join(" / ")}`,
                      )
                    }
                  >
                    {t("Un petit indice ?", "تلميح صغير؟")}
                  </button>
                </div>
              </section>
            ) : null}
            <p className="notebook-note">
              {saved
                ? t(
                    "Tes tableaux restent dans ton carnet sur cet appareil. Tu peux y revenir quand tu veux.",
                    "تبقى لوحاتك في الدفتر على هذا الجهاز. يمكنك العودة إليها متى شئت.",
                  )
                : t(
                    "Le carnet reste ouvert, mais le stockage de cet appareil est plein.",
                    "الدفتر مفتوح، لكن تخزين هذا الجهاز ممتلئ.",
                  )}
            </p>
          </div>
          <div className="conversation-column">
            <div className="chat-companion-label">
              <span>✦</span>
              {t("Aucune question n’est trop petite.", "لا يوجد سؤال صغير.")}
              <label>
                {t("J’ai", "عمري")}
                <select
                  aria-label={t("Âge de l’enfant", "عمر الطفل")}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                >
                  {[6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                {t("ans", "سنوات")}
              </label>
            </div>
            <Chat
              role="student"
              lang={lang}
              messages={chat.messages}
              busy={chat.busy}
              error={chat.error}
              intro={t(
                "Coucou, moi c’est Milo ! 🦊 Je suis là pour t’aider à comprendre. On peut discuter, dessiner ou faire des expériences ensemble. Choisis une découverte ou pose-moi ta question !",
                "أهلاً، أنا ميلو! 🦊 أنا هنا لأساعدك على الفهم. يمكننا الدردشة والرسم والتجربة معاً. اختر اكتشافاً أو اطرح سؤالك!",
              )}
              suggestions={
                suggestions.length
                  ? suggestions
                  : [
                      t("Explique-moi notre tableau", "اشرح لي لوحتنا"),
                      t("Dessine une fleur qui grandit", "ارسم زهرة تنمو"),
                    ]
              }
              onSend={ask}
              onRetry={chat.retry}
              onCancel={chat.cancel}
              contextHint={
                page.strokes.length
                  ? t(
                      `Milo verra tes ${page.strokes.length} trait${page.strokes.length > 1 ? "s" : ""} avec ton prochain message.`,
                      `سيرى ميلو خطوطك (${page.strokes.length}) مع رسالتك القادمة.`,
                    )
                  : undefined
              }
            />
            {newDrawing ? (
              <button
                className="new-board-link"
                onClick={() => {
                  setView("activity");
                  setNewDrawing(false);
                }}
              >
                <Sparkles size={18} />
                {t("Milo a fait évoluer le tableau !", "ميلو طوّر اللوحة!")}
                <ArrowRight size={18} />
              </button>
            ) : null}
            <button
              className="new-conversation"
              disabled={chat.busy}
              onClick={() => {
                chat.reset();
                setSuggestions([]);
              }}
            >
              <RotateCcw size={15} />
              {t("Recommencer la discussion", "بدء محادثة جديدة")}
            </button>
          </div>
        </div>
      </main>
      <footer className="child-footer">
        {t(
          "Groupe scolaire Alexandre · On grandit ensemble.",
          "مجموعة مدارس ألكسندر · نكبر معاً.",
        )}
        <span>✦</span>
        {t(
          "Avec un peu de curiosité, tout commence.",
          "كل شيء يبدأ بقليل من الفضول.",
        )}
      </footer>
    </div>
  );
}
