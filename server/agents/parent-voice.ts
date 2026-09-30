import type { Language, ParentPresentation } from "@/lib/contracts";

const plain = (value: string) => value
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .toLowerCase();

export function wantsHomeworkDetails(question: string, presentation: ParentPresentation | null): presentation is Extract<ParentPresentation, { kind: "tasks" }> {
  if (presentation?.kind !== "tasks") return false;
  const q = plain(question);
  return /devoir|واجب/.test(q) && /(chaque|tous|toutes|liste|detail|quels|quoi|date|rendre|retour|faire|demain|كل|جميع|متى|ماذا)/.test(q);
}

const latinDigits = (value: string) => value.replace(/[٠-٩۰-۹]/g, digit =>
  String("٠١٢٣٤٥٦٧٨٩".indexOf(digit) >= 0 ? "٠١٢٣٤٥٦٧٨٩".indexOf(digit) : "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

export function parentVoiceIssues(question: string, answer: string, presentation: ParentPresentation | null): string[] {
  const issues: string[] = [];
  const spoken = plain(answer);
  if (/(en dessous|ci-dessous|plus bas|dans le tableau|dans la liste|voir le tableau|voir la liste|sous ma reponse|أسفل|في الجدول|انظر أدناه)/.test(spoken))
    issues.push("The voice-only answer must never refer to content below, a table, or a list elsewhere on screen.");
  if (!wantsHomeworkDetails(question, presentation)) return issues;
  const normalized = plain(latinDigits(answer));
  const markers = presentation.items.map((item, index) => {
    const subject = plain(item.subject).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\s)${index + 1}[.)]\\s+${subject}`).exec(normalized)?.index ?? -1;
  });
  for (let index = 0; index < presentation.items.length; index++) {
    const marker = markers[index];
    if (marker < 0) {
      issues.push(`Include numbered homework item ${index + 1}.`);
      continue;
    }
    const next = markers.slice(index + 1).find(position => position > marker);
    const segment = normalized.slice(marker, next === undefined ? undefined : next);
    const item = presentation.items[index];
    if (!segment.includes(plain(item.subject))) issues.push(`Item ${index + 1} must name ${item.subject}.`);
    const date = latinDigits(item.dueDate);
    const day = date.match(/\b\d{1,2}\b/)?.[0];
    const year = date.match(/\b20\d{2}\b/)?.[0];
    if (day && year && (!segment.includes(day) || !segment.includes(year)))
      issues.push(`Item ${index + 1} must give its recorded due date ${item.dueDate}.`);
    if (segment.replace(/\b\d+\b/g, "").replace(plain(item.subject), "").trim().length < 12)
      issues.push(`Item ${index + 1} must explain what to do.`);
  }
  return issues;
}

export function homeworkVoiceAnswer(presentation: Extract<ParentPresentation, { kind: "tasks" }>, lang: Language, instructions: string[]): string {
  const lead = lang === "fr"
    ? `Voici les ${presentation.items.length} travaux enregistrés, avec leurs dates de retour.`
    : `هذه هي المهام المسجلة وعددها ${presentation.items.length}، مع تواريخ تسليمها.`;
  const items = presentation.items.map((item, index) => {
    const instruction = (instructions[index] || item.description).replace(/\s+/g, " ").replace(/\p{Extended_Pictographic}/gu, "").trim().replace(/[.!؟]+$/u, "").slice(0, 280);
    const missingDate = item.dueDate.toLowerCase().startsWith("date non") || item.dueDate.includes("غير مسجل");
    return lang === "fr"
      ? `${index + 1}. ${item.subject}, ${missingDate ? "date de retour non renseignée" : `pour le ${item.dueDate}`} : ${instruction}.`
      : `${index + 1}. ${item.subject}، ${missingDate ? "تاريخ التسليم غير مسجل" : `للتسليم في ${item.dueDate}`}: ${instruction}.`;
  });
  return [lead, ...items].join(" ");
}

export function homeworkVoiceFallback(presentation: Extract<ParentPresentation, { kind: "tasks" }>, lang: Language): string {
  return homeworkVoiceAnswer(presentation, lang, presentation.items.map(item => item.description));
}
