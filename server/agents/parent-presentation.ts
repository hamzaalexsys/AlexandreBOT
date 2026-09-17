import type {
  Language,
  ParentPresentation,
  ParentPresentationRequest,
} from "@/lib/contracts";

type ParentFact = { tool: string; data: unknown };
type Item = Record<string, unknown>;

const record = (value: unknown): Item =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Item)
    : {};
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : String(value ?? "").trim();
const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const plain = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
const itemsFor = (facts: ParentFact[], tool: string) => {
  const data = record(facts.find((fact) => fact.tool === tool)?.data);
  return Array.isArray(data.items) ? data.items.map(record) : [];
};
const translateSubject = (value: unknown, lang: Language) => {
  const subject = text(value);
  const key = plain(subject);
  if (lang === "ar") {
    if (key.includes("francais")) return "اللغة الفرنسية";
    if (key.includes("arabe")) return "اللغة العربية";
    if (key.includes("anglais")) return "اللغة الإنجليزية";
    if (key.includes("mathematique")) return "الرياضيات";
  }
  if (key.includes("francais")) return "Français";
  if (key.includes("arabe")) return "Arabe";
  if (key.includes("anglais")) return "Anglais";
  if (key.includes("mathematique")) return "Mathématiques";
  return subject || (lang === "fr" ? "Non précisée" : "غير محددة");
};
const dateLabel = (value: unknown, lang: Language) => {
  const raw = text(value).slice(0, 10);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00Z`)
    : null;
  if (!parsed || Number.isNaN(parsed.getTime()))
    return raw || (lang === "fr" ? "Date non renseignée" : "التاريخ غير مسجل");
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "ar-MA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
};
const scoreLabel = (item: Item) => {
  const score = number(item.rawScore);
  const scale = number(item.scale);
  if (score === null || scale === null) return "—";
  return `${score.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} / ${scale.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`;
};
const tomorrowIso = () => {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return tomorrow.toISOString().slice(0, 10);
};

type PresentationLabels = { title?: unknown; caption?: unknown };
type PresentationFilters = { subject?: unknown; schoolYear?: unknown };

const matchesFilter = (value: unknown, filter: unknown) => {
  const requested = text(filter);
  if (!requested) return true;
  const candidate = plain(text(value));
  return candidate.includes(plain(requested)) || plain(requested).includes(candidate);
};

const applyFilters = (
  items: Item[],
  filters: PresentationFilters,
  subjectField = "subject",
) =>
  items.filter(
    (item) =>
      matchesFilter(item[subjectField], filters.subject) &&
      matchesFilter(item.schoolYear, filters.schoolYear),
  );

const choose = (
  override: unknown,
  fr: string,
  ar: string,
  lang: Language,
) => {
  const value = text(override);
  return value || (lang === "fr" ? fr : ar);
};

const homeworkComponent = (
  facts: ParentFact[],
  lang: Language,
  onlyTomorrow: boolean,
) => {
  const tr = <T>(fr: T, ar: T) => (lang === "fr" ? fr : ar);
  const all = itemsFor(facts, "read_homework");
  const items = onlyTomorrow
    ? all.filter((item) => text(item.dueDate) === tomorrowIso())
    : all;
  if (!items.length)
    return {
      kind: "empty" as const,
      title: tr("Devoirs", "الواجبات"),
      detail: onlyTomorrow
        ? tr(
            "Aucun devoir pour demain n’est publié dans la vue scolaire.",
            "لا يوجد واجب منشور ليوم غد في السجل المدرسي.",
          )
        : tr(
            "Aucun devoir récent n’est publié dans la vue scolaire.",
            "لا يوجد واجب حديث منشور في السجل المدرسي.",
          ),
    };
  return {
    kind: "tasks" as const,
    title: tr("Devoirs à préparer", "الواجبات المطلوب تحضيرها"),
    items: items.slice(0, 12).map((item) => ({
      dueDate: dateLabel(item.dueDate || item.publishedAt, lang),
      subject: translateSubject(item.subject, lang),
      description: text(item.description) || tr("Consigne non renseignée", "التعليمات غير مسجلة"),
    })),
  };
};

const latestMarksComponent = (
  facts: ParentFact[],
  lang: Language,
  labels: PresentationLabels = {},
  filters: PresentationFilters = {},
) => {
  const tr = <T>(fr: T, ar: T) => (lang === "fr" ? fr : ar);
  const items = applyFilters(itemsFor(facts, "read_latest_marks"), filters);
  if (!items.length && (text(filters.subject) || text(filters.schoolYear)))
    return noMatchComponent(
      labels,
      lang,
      "Aucune dernière note ne correspond à cette sélection dans la vue scolaire.",
      "لا توجد آخر نقطة مطابقة لهذا الاختيار في المعطيات المدرسية.",
    );
  return {
    kind: "table" as const,
    title: choose(labels.title, "Dernière note par matière", "آخر نقطة حسب المادة", lang),
    caption: text(labels.caption) ||
      (items[0]?.schoolYear
        ? tr(`Année ${text(items[0].schoolYear)}`, `السنة ${text(items[0].schoolYear)}`)
        : tr("Dernière année terminée", "آخر سنة دراسية مكتملة")),
    columns: tr(
      ["Matière", "Note", "Date", "Évaluation"],
      ["المادة", "النقطة", "التاريخ", "التقييم"],
    ),
    rows: items.slice(0, 16).map((item) => [
      translateSubject(item.subject, lang),
      scoreLabel(item),
      dateLabel(item.examDate, lang),
      text(item.exam) || "—",
    ]),
  };
};

const resultsComponent = (
  facts: ParentFact[],
  lang: Language,
  source: "year_results" | "subject_results" | "term_results",
  labels: PresentationLabels = {},
  filters: PresentationFilters = {},
) => {
  const tr = <T>(fr: T, ar: T) => (lang === "fr" ? fr : ar);
  const useTerms = source === "term_results";
  const useSubjects = source === "subject_results";
  const items = applyFilters(
    itemsFor(
      facts,
      useTerms ? "read_term_results" : useSubjects ? "read_subject_results" : "read_year_results",
    ),
    filters,
    useTerms ? "term" : "subject",
  );
  if (!items.length && (text(filters.subject) || text(filters.schoolYear)))
    return noMatchComponent(
      labels,
      lang,
      "Aucune ligne ne correspond à cette sélection dans la vue scolaire.",
      "لا يوجد سجل مطابق لهذا الاختيار في المعطيات المدرسية.",
    );
  return {
    kind: "table" as const,
    title: choose(labels.title, "Résultats scolaires", "النتائج الدراسية", lang),
    caption: text(labels.caption) ||
      tr("Moyennes indicatives calculées sur 20.", "معدلات إرشادية محسوبة على 20."),
    columns: useTerms
      ? tr(["Année", "Période", "Moyenne", "Notes"], ["السنة", "الفترة", "المعدل", "النقط"])
      : useSubjects
        ? tr(["Année", "Matière", "Moyenne", "Notes"], ["السنة", "المادة", "المعدل", "النقط"])
        : tr(["Année", "Moyenne", "Minimum", "Notes"], ["السنة", "المعدل", "الأدنى", "النقط"]),
    rows: items.slice(0, 16).map((item) =>
      useTerms
        ? [text(item.schoolYear), text(item.term), `${text(item.average20)} / 20`, text(item.noteCount)]
        : useSubjects
          ? [text(item.schoolYear), translateSubject(item.subject, lang), `${text(item.average20)} / 20`, text(item.noteCount)]
          : [text(item.schoolYear), `${text(item.average20)} / 20`, `${text(item.minimum20)} / 20`, text(item.noteCount)],
    ),
  };
};

const markDetailsComponent = (
  facts: ParentFact[],
  lang: Language,
  labels: PresentationLabels = {},
  filters: PresentationFilters = {},
) => {
  const tr = <T>(fr: T, ar: T) => (lang === "fr" ? fr : ar);
  const items = applyFilters(itemsFor(facts, "read_mark_details"), filters);
  if (!items.length)
    return {
      kind: "empty" as const,
      title: choose(labels.title, "Notes en détail", "النقط بالتفصيل", lang),
      detail: text(filters.subject) || text(filters.schoolYear)
        ? lang === "fr"
          ? "Aucune note individuelle ne correspond à cette sélection dans la vue scolaire."
          : "لا توجد نقطة فردية مطابقة لهذا الاختيار في المعطيات المدرسية."
        : lang === "fr"
          ? "Aucune note individuelle n’est enregistrée dans la vue scolaire."
          : "لا توجد نقطة فردية مسجلة في المعطيات المدرسية.",
    };
  return {
    kind: "table" as const,
    title: choose(labels.title, "Notes en détail", "النقط بالتفصيل", lang),
    caption: text(labels.caption) ||
      tr(
        "Chaque note valide, ramenée sur 20 quand l’échelle diffère.",
        "كل نقطة صالحة، محولة إلى 20 عند اختلاف السلم.",
      ),
    columns: tr(
      ["Année", "Semestre", "Évaluation", "Note"],
      ["السنة", "الدورة", "التقييم", "النقطة"],
    ),
    rows: items.slice(0, 30).map((item) => [
      text(item.schoolYear),
      text(item.term) || "—",
      [text(item.exam), dateLabel(item.examDate, lang)].filter(Boolean).join(" · "),
      scoreLabel(item),
    ]),
  };
};

const competenciesComponent = (
  facts: ParentFact[],
  lang: Language,
  labels: PresentationLabels = {},
  filters: PresentationFilters = {},
) => {
  const tr = <T>(fr: T, ar: T) => (lang === "fr" ? fr : ar);
  const items = applyFilters(itemsFor(facts, "read_competency_scores"), filters)
    .filter((item) => {
      const score = number(item.score);
      return score !== null && score >= 0 && score <= 3;
    });
  if (!items.length)
    return {
      kind: "empty" as const,
      title: choose(labels.title, "Compétences évaluées", "الكفاءات المقيّمة", lang),
      detail:
        text(filters.subject) || text(filters.schoolYear)
          ? lang === "fr"
            ? "Aucune compétence évaluée ne correspond à cette sélection dans la vue scolaire."
            : "لا توجد كفاءة مقيّمة مطابقة لهذا الاختيار في المعطيات المدرسية."
          : lang === "fr"
            ? "Aucune évaluation de compétence n’est enregistrée dans la vue scolaire."
            : "لا يوجد تقييم للكفاءات مسجل في المعطيات المدرسية.",
    };
  return {
    kind: "table" as const,
    title: choose(labels.title, "Compétences évaluées", "الكفاءات المقيّمة", lang),
    caption: text(labels.caption) ||
      tr(
        "Score de maîtrise de 0 (non maîtrisée) à 3 (maîtrisée) par examen.",
        "درجة التمكن من 0 (غير مكتسبة) إلى 3 (مكتسبة) حسب الاختبار.",
      ),
    columns: tr(
      ["Matière", "Compétence", "Score", "Date"],
      ["المادة", "الكفاءة", "الدرجة", "التاريخ"],
    ),
    rows: items.slice(0, 30).map((item) => [
      translateSubject(item.subject, lang),
      text(item.competency) || "—",
      number(item.score) === null
        ? "—"
        : `${number(item.score)} / 3`,
      dateLabel(item.examDate, lang),
    ]),
  };
};

const teachersComponent = (
  facts: ParentFact[],
  lang: Language,
  labels: PresentationLabels = {},
) => {
  const tr = <T>(fr: T, ar: T) => (lang === "fr" ? fr : ar);
  const items = itemsFor(facts, "read_class_teachers");
  if (!items.length)
    return {
      kind: "empty" as const,
      title: choose(labels.title, "Enseignants de la classe", "أساتذة القسم", lang),
      detail: tr(
        "Aucun enseignant n’est associé à la classe dans la vue scolaire.",
        "لا يوجد أستاذ مرتبط بالقسم في المعطيات المدرسية.",
      ),
    };
  return {
    kind: "table" as const,
    title: choose(labels.title, "Enseignants de la classe", "أساتذة القسم", lang),
    caption: text(labels.caption) ||
      tr(
        "Professeurs titulaires par matière, nom uniquement.",
        "الأساتذة المسؤولون حسب المادة، بالاسم فقط.",
      ),
    columns: tr(["Matière", "Enseignant"], ["المادة", "الأستاذ"]),
    rows: items.slice(0, 20).map((item) => [
      translateSubject(item.subject, lang),
      [text(item.firstName), text(item.lastName)].filter(Boolean).join(" ") || "—",
    ]),
  };
};

const activitiesComponent = (
  facts: ParentFact[],
  lang: Language,
  labels: PresentationLabels = {},
) => {
  const tr = <T>(fr: T, ar: T) => (lang === "fr" ? fr : ar);
  const items = itemsFor(facts, "read_student_activities");
  if (!items.length)
    return {
      kind: "empty" as const,
      title: choose(labels.title, "Activités parascolaires", "الأنشطة الموازية", lang),
      detail: tr(
        "Aucune inscription à une activité parascolaire n’est enregistrée.",
        "لا يوجد تسجيل في أنشطة موازية.",
      ),
    };
  return {
    kind: "timeline" as const,
    title: choose(labels.title, "Activités parascolaires", "الأنشطة الموازية", lang),
    caption: text(labels.caption) ||
      tr(
        `${items.length} activité${items.length > 1 ? "s" : ""} enregistrée${items.length > 1 ? "s" : ""} dans la vue scolaire`,
        `${items.length} نشاط مسجل في المعطيات المدرسية`,
      ),
    items: items.slice(0, 12).map((item) => ({
      date: dateLabel(item.activityDate, lang),
      title: text(item.activityType) || tr("Activité", "نشاط"),
      detail: [text(item.activity), translateSubject(item.className, lang)]
        .filter(Boolean)
        .join(" · "),
      tone: "neutral" as const,
    })),
  };
};

const journeyComponent = (
  facts: ParentFact[],
  lang: Language,
  labels: PresentationLabels = {},
) => {
  const tr = <T>(fr: T, ar: T) => (lang === "fr" ? fr : ar);
  const items = itemsFor(facts, "read_school_journey");
  if (!items.length)
    return {
      kind: "empty" as const,
      title: choose(labels.title, "Parcours scolaire", "المسار الدراسي", lang),
      detail: tr(
        "Aucun parcours n’est enregistré dans la vue scolaire.",
        "لا يوجد مسار مسجل في المعطيات المدرسية.",
      ),
    };
  return {
    kind: "timeline" as const,
    title: choose(labels.title, "Parcours scolaire", "المسار الدراسي", lang),
    caption: text(labels.caption) ||
      tr(
        "Classe enregistrée par année scolaire.",
        "القسم المسجل لكل سنة دراسية.",
      ),
    items: items.slice(0, 12).map((item) => ({
      date: text(item.schoolYear) || "—",
      title: text(item.className) || tr("Non précisée", "غير محددة"),
      detail: text(item.levelName) || "",
      tone: (item.isCurrent === true ? "good" : "neutral") as "good" | "neutral",
    })),
  };
};

const noMatchComponent = (
  labels: PresentationLabels,
  lang: Language,
  detailFr: string,
  detailAr: string,
) => ({
  kind: "empty" as const,
  title: choose(labels.title, "Résultats scolaires", "النتائج الدراسية", lang),
  detail: text(labels.caption) || (lang === "fr" ? detailFr : detailAr),
});

const attendanceComponent = (facts: ParentFact[], lang: Language) => {
  const tr = <T>(fr: T, ar: T) => (lang === "fr" ? fr : ar);
  const items = itemsFor(facts, "read_attendance");
  if (!items.length)
    return {
      kind: "empty" as const,
      title: tr("Absences", "الغياب"),
      detail: tr(
        "Aucune absence n’est enregistrée cette année.",
        "لا يوجد غياب مسجل خلال هذه السنة.",
      ),
    };
  return {
    kind: "timeline" as const,
    title: tr("Absences enregistrées", "الغيابات المسجلة"),
    caption: tr(
      `${items.length} ligne${items.length > 1 ? "s" : ""} dans la vue scolaire`,
      `${items.length} سجل في المعطيات المدرسية`,
    ),
    items: items.slice(0, 12).map((item) => {
      const justified = item.justified === true;
      return {
        date: dateLabel(item.dateFrom, lang),
        title: translateSubject(item.subject, lang),
        detail: justified
          ? tr("Justifiée", "مبررة")
          : tr("Non justifiée", "غير مبررة"),
        tone: (justified ? "good" : "attention") as "good" | "attention",
      };
    }),
  };
};

const assiduityComponent = (facts: ParentFact[], lang: Language) => {
  const tr = <T>(fr: T, ar: T) => (lang === "fr" ? fr : ar);
  const items = itemsFor(facts, "read_assiduity");
  if (!items.length)
    return {
      kind: "empty" as const,
      title: tr("Assiduité", "المواظبة"),
      detail: tr(
        "Aucune observation d’assiduité n’est enregistrée cette année.",
        "لا توجد ملاحظة مواظبة مسجلة خلال هذه السنة.",
      ),
    };
  return {
    kind: "timeline" as const,
    title: tr("Suivi d’assiduité", "متابعة المواظبة"),
    items: items.slice(0, 12).map((item) => ({
      date: dateLabel(item.date, lang),
      title: text(item.label) || translateSubject(item.subject, lang),
      detail: [translateSubject(item.subject, lang), text(item.comment)]
        .filter(Boolean)
        .join(" · "),
      tone: "neutral" as const,
    })),
  };
};

const examsComponent = (facts: ParentFact[], lang: Language) => {
  const tr = <T>(fr: T, ar: T) => (lang === "fr" ? fr : ar);
  const items = itemsFor(facts, "read_exams");
  if (!items.length)
    return {
      kind: "empty" as const,
      title: tr("Examens", "الامتحانات"),
      detail: tr(
        "Aucun examen récent ou à venir n’est publié pour la classe.",
        "لا يوجد امتحان حديث أو قادم منشور للقسم.",
      ),
    };
  return {
    kind: "timeline" as const,
    title: tr("Examens de la classe", "امتحانات القسم"),
    items: items.slice(0, 12).map((item) => ({
      date: dateLabel(item.examDate, lang),
      title: translateSubject(item.subject, lang),
      detail: text(item.exam) || text(item.examType),
      tone: "neutral" as const,
    })),
  };
};

export function parentPresentationFromRequest(
  facts: ParentFact[],
  lang: Language,
  request: ParentPresentationRequest,
  question = "",
): ParentPresentation | null {
  const labels = { title: request.title, caption: request.caption };
  const filters = {
    subject: request.subject ?? undefined,
    schoolYear: request.schoolYear ?? undefined,
  };
  switch (request.source) {
    case "homework":
      return homeworkComponent(
        facts,
        lang,
        /(demain|غدا)/.test(plain(question)),
      );
    case "latest_marks":
      return latestMarksComponent(facts, lang, labels, filters);
    case "mark_details":
      return markDetailsComponent(facts, lang, labels, filters);
    case "competencies":
      return competenciesComponent(facts, lang, labels, filters);
    case "teachers":
      return teachersComponent(facts, lang, labels);
    case "activities":
      return activitiesComponent(facts, lang, labels);
    case "journey":
      return journeyComponent(facts, lang, labels);
    case "year_results":
      return resultsComponent(facts, lang, "year_results", labels, filters);
    case "subject_results":
      return resultsComponent(facts, lang, "subject_results", labels, filters);
    case "term_results":
      return resultsComponent(facts, lang, "term_results", labels, filters);
    case "attendance":
      return attendanceComponent(facts, lang);
    case "assiduity":
      return assiduityComponent(facts, lang);
    case "exams":
      return examsComponent(facts, lang);
    default:
      return null;
  }
}

export function parentPresentationFor(
  question: string,
  facts: ParentFact[],
  lang: Language,
): ParentPresentation | null {
  const q = plain(question);

  if (/(devoir|travail.{0,20}(demain|maison))/.test(q))
    return homeworkComponent(facts, lang, q.includes("demain"));

  if (/(parcours|scolarite|annee.{0,10}classe|classe.{0,10}annee|niveau.{0,10}passe|مسار|السنين الدراسية)/.test(q))
    return journeyComponent(facts, lang);

  if (
    /(qui est le|qui sont les|qui enseigne|le nom du|le nom de la|les noms des).{0,40}(prof|professeur|enseign)|مين الأستاذ|من هو الأستاذ|أستاذ.{0,15}مادة/.test(q)
  )
    return teachersComponent(facts, lang);

  if (/(activite|parascolaire|excursion|sortie scolaire|نشاط|أنشطة|رحلة)/.test(q))
    return activitiesComponent(facts, lang);

  if (/(competence|capacite|savoir-faire|مهارة|كفاءة)/.test(q))
    return competenciesComponent(facts, lang);

  if (
    /(note|notes).{0,30}(detail|detailler|detaillees)|detail.{0,25}(note|notes)|chaque note|toutes les notes|كل نقطة|تفاصيل.{0,10}نقط|نقط.{0,15}تفاصيل/.test(q)
  )
    return markDetailsComponent(facts, lang);

  if (/(derniere|dernieres|recent).{0,35}note|note.{0,35}(derniere|annee derniere)|آخر.{0,20}(نقط|علام)|نقط.{0,20}السنة الماضية/.test(q))
    return latestMarksComponent(facts, lang);

  if (/(note|resultat|moyenne|matiere|semestre|trimestre|bulletin|نقط|نتائج|معدل)/.test(q)) {
    const useTerms = /(semestre|trimestre|periode|دورة|أسدس)/.test(q);
    const useSubjects = /(matiere|francais|arabe|anglais|mathematique|مادة|فرنسية|عربية|إنجليزية|رياضيات)/.test(q);
    return resultsComponent(
      facts,
      lang,
      useTerms ? "term_results" : useSubjects ? "subject_results" : "year_results",
    );
  }

  if (/(absence|absent|justifi|غياب)/.test(q))
    return attendanceComponent(facts, lang);

  if (/(assiduite|assidu|مواظبة|انضباط)/.test(q))
    return assiduityComponent(facts, lang);

  if (/(examen|controle|evaluation|امتحان|فرض)/.test(q))
    return examsComponent(facts, lang);

  return null;
}

export function parentSuggestionsFor(
  question: string,
  suggestions: string[],
) {
  const q = plain(question);
  const pattern = /(devoir|travail.{0,20}(demain|maison)|واجب|غد)/.test(q)
    ? /(devoir|enseignant|classe|واجب|أستاذ|قسم)/i
    : /(assiduite|assidu|مواظب|انضباط)/.test(q)
      ? /(assiduit|école|مواظب|مدرس)/i
      : /(absence|absent|justifi|motif|غياب)/.test(q)
        ? /(absence|justifi|motif|غياب|تبرير)/i
        : /(examen|controle|evaluation|امتحان|فرض)/.test(q)
          ? /(examen|contrôle|evaluation|matière|امتحان|فرض|مادة)/i
          : /(derniere|dernieres|recent).{0,35}note|note.{0,35}(derniere|annee derniere)|آخر.{0,20}(نقط|علام)/.test(q)
            ? /(note|matière|résultat|نقط|مادة|نتيجة)/i
            : null;
  return pattern
    ? suggestions.filter((suggestion) => pattern.test(suggestion)).slice(0, 2)
    : suggestions.slice(0, 2);
}
