export type ParentFocus =
  | "summary"
  | "journey"
  | "results"
  | "attendance"
  | "records"
  | "support";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();

export function parentFocusFor(message: string): ParentFocus {
  const text = normalize(message);
  if (/absence|absent|presence|retard|justifi|motif|غياب|حضور|تبرير/.test(text))
    return "attendance";
  if (
    /parcours|classe|annee scolaire|depuis|historique scolaire|مسار|قسم|السنة الدراسية/.test(
      text,
    )
  )
    return "journey";
  if (
    /aider|accompagn|a la maison|action|rendez-vous|enseignant|professeur|question.*poser|مساعدة|البيت|الاستاذ|المعلم|موعد/.test(
      text,
    )
  )
    return "support";
  if (/message|devoir|observation|acquis|dossier|رسالة|واجب|ملاحظة|مكتسب/.test(text))
    return "records";
  if (
    /resultat|note|moyenne|matiere|math|francais|arabe|anglais|progress|force|difficulte|semestre|comparer|baisse|hausse|نقطة|نتيجة|معدل|مادة|رياضيات|فرنسية|عربية|انجليزية|تقدم|صعوبة|دورة/.test(
      text,
    )
  )
    return "results";
  return "summary";
}
