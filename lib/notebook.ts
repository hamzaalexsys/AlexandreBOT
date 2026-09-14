import type { Reply, Scene, Stroke, Quiz } from "./contracts";
export type BoardPage = {
  scene: Scene;
  strokes: Stroke[];
  createdAt: number;
  quiz?: Quiz | null;
};
export type Notebook = { pages: BoardPage[]; index: number };
type BoardMutation = Pick<Reply, "scene" | "boardAction" | "removeShapeIds">;

export type DrawingIntent = "inspect" | "solve" | "none";

function normalizedLatin(message: string) {
  return message
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr");
}

export function drawingIntent(message: string): DrawingIntent {
  const latin = normalizedLatin(message);
  const inspect =
    /j.?ai\s+dessin(?:e|er)\s+quoi|qu.?est.ce\s+que\s+j.?ai\s+dessin|que\s+vois.tu.{0,60}(dessin|tableau)|reconnais.{0,50}(dessin|trace)|regarde.{0,45}(mon\s+dessin|mes\s+traits|notre\s+tableau)/u.test(
      latin,
    ) ||
    /(?:ماذا|ما الذي).{0,35}(?:رسمت|كتبت)|(?:انظر|شاهد).{0,35}(?:رسمي|خطوطي|لوحتنا)/u.test(
      message,
    );
  if (inspect) return "inspect";

  const solve =
    /\b(resous|resoud|resoudre|corrige|verifie|calcule)\b/u.test(latin) ||
    /\b(explique).{0,70}\b(cette|mon|l.?equation|le\s+calcul|l.?operation|tableau|dessin)\b/u.test(
      latin,
    ) ||
    /\b(est.ce|c.?est).{0,25}\b(juste|correct|bon)\b/u.test(latin) ||
    /(?:حل|صحح|تحقق|احسب|اشرح).{0,70}(?:المعادلة|الحساب|العملية|رسمي|اللوحة|هذا)/u.test(
      message,
    );
  return solve ? "solve" : "none";
}

export function requestsBoardVisual(message: string) {
  if (drawingIntent(message) === "inspect") return false;
  const latin = normalizedLatin(message);
  const directDrawing =
    /\b(dessine|dessiner|illustre|illustrer|schema|diagramme|animation)\b/u.test(
      latin,
    );
  const boardInstruction =
    /\b(montre|affiche|mets|ecris|cree|fais)\b.{0,70}\b(tableau|dessin|schema|diagramme|animation|figure|exemple)/u.test(
      latin,
    );
  const arabicInstruction =
    /(?:أرني|ارني|اعرض|اكتب|ضع).{0,70}(?:اللوحة|السبورة|أمثلة|امثلة|رسما|رسمًا|شكلا|شكلاً)|ارسم/u.test(
      message,
    );
  return directDrawing || boardInstruction || arabicInstruction;
}

export type SimulationType =
  | "bounce"
  | "orbit"
  | "pendulum"
  | "water"
  | "fractions";

export function requestedSimulationType(message: string): SimulationType | null {
  const latin = message
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr");
  if (
    /\b(ballon|balle)\b.{0,80}\b(rebond|trajectoire|hauteur|experience|simulation|interacti)/u.test(
      latin,
    ) ||
    /\b(rebond|trajectoire|hauteur|experience|simulation|interacti)\b.{0,80}\b(ballon|balle)\b/u.test(
      latin,
    ) ||
    /(?:كرة|بالون).{0,80}(?:ترتد|مسار|ارتفاع|تجربة|تفاعلية)/u.test(message)
  )
    return "bounce";
  if (
    /\b(orbite|orbite|planete.{0,35}(tourne|autour)|systeme solaire)\b/u.test(latin) ||
    /(?:مدار|كوكب.{0,35}يدور|النظام الشمسي)/u.test(message)
  )
    return "orbit";
  if (/\b(pendule|balancoire)\b/u.test(latin) || /(?:بندول|أرجوحة|ارجوحة)/u.test(message))
    return "pendulum";
  if (/\bcycle de l.?eau\b/u.test(latin) || /دورة الماء/u.test(message))
    return "water";
  if (
    /\b(fraction|pizza.{0,35}(part|coupe|division))\b/u.test(latin) ||
    /(?:كسور|كسر|بيتزا.{0,35}(جزء|قطع))/u.test(message)
  )
    return "fractions";
  return null;
}

export function normalizeBoardAction<T extends BoardMutation>(
  reply: T,
  current?: Scene,
): T {
  if (reply.boardAction !== "keep" || !reply.scene) return reply;
  const hasVisual =
    reply.scene.shapes.length > 0 || Boolean(reply.scene.simulation);
  if (!hasVisual) return { ...reply, scene: null };
  const currentIsBlank =
    Boolean(current) &&
    current?.shapes.length === 0 &&
    !current?.simulation;
  return {
    ...reply,
    boardAction:
      currentIsBlank || current?.id === reply.scene.id ? "update" : "new",
  };
}

export function applyBoardReply(
  book: Notebook,
  reply: BoardMutation,
): Notebook {
  const normalized = normalizeBoardAction(reply, book.pages[book.index]?.scene);
  if (!normalized.scene || normalized.boardAction === "keep") return book;
  const incoming = normalized.scene;
  if (normalized.boardAction === "new" || !book.pages.length) {
    const pages = [
      ...book.pages,
      { scene: incoming, strokes: [], createdAt: Date.now() },
    ];
    return { pages, index: pages.length - 1 };
  }
  const current = book.pages[book.index];
  const remove = new Set(normalized.removeShapeIds);
  const shapes = new Map(
    current.scene.shapes.filter((s) => !remove.has(s.id)).map((s) => [s.id, s]),
  );
  incoming.shapes.forEach((s) => shapes.set(s.id, s));
  const merged: Scene = {
    ...current.scene,
    ...incoming,
    id: current.scene.id,
    shapes: [...shapes.values()].slice(0, 45),
  };
  return {
    ...book,
    pages: book.pages.map((p, i) =>
      i === book.index ? { ...p, scene: merged } : p,
    ),
  };
}
