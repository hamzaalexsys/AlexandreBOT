import { sceneSchema, quizSchema, type Scene, type Stroke } from "./contracts";
import type { Notebook } from "./notebook";
const storageKey = "alexandrebot.notebook.v2";
const entryKey = "alexandrebot.student.entry";
function readNotebook(raw: string): Notebook | null {
  if (raw.length > 10000000) return null;
  const data = JSON.parse(raw) as Notebook;
  if (!Array.isArray(data.pages) || !data.pages.length) return null;
  const pages = data.pages.map((p) => ({
    scene: sceneSchema.parse(p.scene),
    strokes: Array.isArray(p.strokes)
      ? p.strokes
          .filter(
            (s: Stroke) =>
              typeof s?.points === "string" &&
              s.points.length < 12000 &&
              /^[0-9.,\s]+$/.test(s.points) &&
              /^#[0-9a-f]{6}$/i.test(s.color),
          )
          .slice(0, 80)
      : [],
    createdAt: typeof p.createdAt === "number" ? p.createdAt : Date.now(),
    quiz: quizSchema.safeParse(p.quiz).success ? p.quiz : null,
  }));
  return {
    pages,
    index: Number.isInteger(data.index)
      ? Math.max(0, Math.min(pages.length - 1, data.index))
      : 0,
  };
}

export function createNotebookStore(initial: Scene) {
  const initialState = {
    book: {
      pages: [{ scene: initial, strokes: [], createdAt: Date.now() }],
      index: 0,
    } as Notebook,
    saved: true,
  };
  let state = initialState;
  let ready = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const save = () => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state.book));
      if (!state.saved) {
        state = { ...state, saved: true };
        notify();
      }
    } catch {
      if (state.saved) {
        state = { ...state, saved: false };
        notify();
      }
    }
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot: () => state,
    serverSnapshot: () => initialState,
    hydrate() {
      if (ready) return;
      try {
        const raw = localStorage.getItem(storageKey);
        const book = raw ? readNotebook(raw) : null;
        const firstEntry = sessionStorage.getItem(entryKey) !== "open";
        sessionStorage.setItem(entryKey, "open");
        if (book && firstEntry) {
          const blank = {
            scene: initial,
            strokes: [],
            createdAt: Date.now(),
            quiz: null,
          };
          state = {
            book: { pages: [...book.pages, blank], index: book.pages.length },
            saved: true,
          };
        } else if (book) state = { book, saved: true };
      } catch {
        state = { ...state, saved: false };
      }
      ready = true;
      notify();
      save();
    },
    setBook(update: Notebook | ((current: Notebook) => Notebook)) {
      const book = typeof update === "function" ? update(state.book) : update;
      if (book === state.book) return;
      state = { ...state, book };
      notify();
      clearTimeout(timer);
      timer = setTimeout(save, 350);
    },
    flush() {
      clearTimeout(timer);
      save();
    },
  };
}
