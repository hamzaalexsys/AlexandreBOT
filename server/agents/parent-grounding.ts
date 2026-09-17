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
    .replace(/[–—]/g, "-")
    .toLowerCase();

const compact = (value: string) => plain(value).replace(/[^a-z0-9\u0600-\u06ff]/gu, "");

const multiYearIntent = (q: string) =>
  /(evolution|evolu|compar|progress|au cours des annees|au fil des annees|toutes.{0,20}matieres|عبر.{0,12}السنوات|تطور|مقارنة|جميع.{0,12}المواد)/.test(q);

const hasUnsupportedResultCoverageClaim = (value: string) =>
  plain(value)
    .split(/(?<=[.!?؟;])\s*|\n+/u)
    .some((sentence) => {
      const unsupported =
        /(?:(aucun|pas de|absence de|non.{0,20}enregistr).{0,35}(resultat|note|moyenne).{0,120}(2025\/2026|2026\/2027)|(2025\/2026|2026\/2027).{0,120}(aucun|pas de|absence de|non.{0,20}enregistr).{0,35}(resultat|note|moyenne))/.test(
          sentence,
        );
      if (!unsupported) return false;
      const explicitlyQualified =
        /(ne (?:peut|pouvons|permet|signifie).{0,70}(dire|affirmer|conclure|deduire)|impossible.{0,45}(dire|affirmer|conclure|deduire)|n.?ont.{0,35}pas ete (interroge|consulte)|n.?avons.{0,35}pas (interroge|consulte))/.test(
          sentence,
        );
      return !explicitlyQualified;
    });

const dataFor = (facts: ParentFact[], tool: string) =>
  record(facts.find((fact) => fact.tool === tool)?.data);

const itemsFor = (facts: ParentFact[], tool: string) => {
  const items = dataFor(facts, tool).items;
  return Array.isArray(items) ? items.map(record) : [];
};

const scoreVariants = (value: number) => {
  const fixed = value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return [fixed, fixed.replace(".", ",")];
};

const mentionsScore = (answer: string, value: unknown) => {
  const parsed = number(value);
  return parsed !== null && scoreVariants(parsed).some((score) => answer.includes(score));
};

const mentionsDate = (answer: string, value: unknown) => {
  const raw = text(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return true;
  if (answer.includes(raw)) return true;
  const [, month, day] = raw.split("-").map(Number);
  const months = [
    "janvier",
    "fevrier",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "aout",
    "septembre",
    "octobre",
    "novembre",
    "decembre",
  ];
  return new RegExp(`\\b${day}\\s+(?:${months[month - 1]}|${months[month - 1]?.slice(0, 4)})`).test(answer);
};

const cleanDataText = (value: unknown) =>
  text(value).replace(/\s+/g, " ").slice(0, 400);

const itemLine = (parts: unknown[]) =>
  parts.map(cleanDataText).filter(Boolean).join(" | ");

export function parentFactDigest(facts: ParentFact[], question = "") {
  const overview = dataFor(facts, "read_child_overview");
  const journey = itemsFor(facts, "read_school_journey");
  const years = itemsFor(facts, "read_year_results");
  const subjects = itemsFor(facts, "read_subject_results");
  const terms = itemsFor(facts, "read_term_results");
  const attendance = itemsFor(facts, "read_attendance");
  const learning = itemsFor(facts, "read_learning");
  const messages = itemsFor(facts, "read_school_messages");
  const homework = itemsFor(facts, "read_homework");
  const assiduity = itemsFor(facts, "read_assiduity");
  const exams = itemsFor(facts, "read_exams");
  const latestMarks = itemsFor(facts, "read_latest_marks");
  const markDetails = itemsFor(facts, "read_mark_details");
  const competencies = itemsFor(facts, "read_competency_scores");
  const teachers = itemsFor(facts, "read_class_teachers");
  const activities = itemsFor(facts, "read_student_activities");

  const q = plain(question);
  const markDetailsFocus =
    /(note|notes).{0,30}(detail|detailler|detaillees)|detail.{0,25}(note|notes)|chaque note|toutes les notes|كل نقطة|تفاصيل.{0,10}نقط|نقط.{0,15}تفاصيل/.test(q);
  const focused = /(devoir|travail.{0,20}(demain|maison)|واجب|غد)/.test(q)
    ? "homework"
    : /(assiduite|assidu|مواظب|انضباط)/.test(q)
      ? "assiduity"
      : /(absence|absent|justifi|motif|غياب)/.test(q)
        ? "attendance"
        : /(competence|capacite|savoir-faire|مهارة|كفاءة)/.test(q)
          ? "competencies"
          : /(examen|controle|evaluation|امتحان|فرض)/.test(q)
            ? "exams"
            : /(qui est le|qui sont les|qui enseigne|le nom du|le nom de la|les noms des).{0,40}(prof|professeur|enseign)|مين الأستاذ|من هو الأستاذ/.test(q)
              ? "teachers"
              : /(activite|parascolaire|excursion|sortie scolaire|نشاط|أنشطة|رحلة)/.test(q)
                ? "activities"
                : /(parcours|scolarite|annee.{0,10}classe|classe.{0,10}annee|مسار)/.test(q)
                  ? "journey"
                  : markDetailsFocus
                  ? "markDetails"
                  : !multiYearIntent(q) &&
                      /(derniere|dernieres|recent).{0,35}note|note.{0,35}(derniere|annee derniere)|آخر.{0,20}(نقط|علام)|نقط.{0,20}السنة الماضية/.test(q)
                    ? "latestMarks"
                    : null;
  const competencyRows = (() => {
    const seen = new Set<string>();
    const unique: Item[] = [];
    for (const item of competencies) {
      const score = number(item.score);
      if (score === null || score < 0 || score > 3) continue;
      const key = `${text(item.subject)}|${text(item.competency)}|${text(item.examDate)}|${text(item.score)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }
    return unique.sort((left, right) => number(left.score)! - number(right.score)!);
  })();
  const competencyBuckets: Record<string, { total: number; count: number }> = {};
  for (const item of competencyRows) {
    const score = number(item.score);
    if (score === null) continue;
    const subject = text(item.subject) || "UNKNOWN";
    const bucket = competencyBuckets[subject] || (competencyBuckets[subject] = { total: 0, count: 0 });
    bucket.total += score;
    bucket.count += 1;
  }
  const competencySummary = Object.entries(competencyBuckets)
    .map(([subject, bucket]) => `${subject}: ${Math.round((bucket.total / bucket.count) * 10) / 10}/3 over ${bucket.count} evaluations`)
    .join(" ; ");
  const markGroups = new Map<string, Item[]>();
  for (const item of markDetails) {
    const key = `${text(item.schoolYear)}|${text(item.subject)}`;
    const bucket = markGroups.get(key) || (markGroups.set(key, []).get(key) as Item[]);
    bucket.push(item);
  }
  const latestDetailYear = markDetails
    .map((item) => text(item.schoolYear))
    .sort()
    .at(-1) || "";
  const latestYearLine = [...markGroups.entries()]
    .filter(([key]) => key.startsWith(`${latestDetailYear}|`))
    .map(([key, items]) =>
      itemLine([
        key.split("|")[1],
        ...items.map(
          (item) => `${item.rawScore}/${item.scale} ${text(item.exam)} ${text(item.examDate).slice(0, 10)}`,
        ),
      ]),
    )
    .join(" ; ");
  const earlierYearsLine = [...markGroups.entries()]
    .filter(([key]) => !key.startsWith(`${latestDetailYear}|`))
    .map(([key, items]) =>
      itemLine([key.split("|")[0], key.split("|")[1], ...items.map((item) => `${item.rawScore}/${item.scale}`)]),
    )
    .join(" ; ");
  const lines = [
    `OBSERVED AT | ${text(overview.observedAt)}`,
    `CURRENT CHILD | ${itemLine([overview.child, overview.className, overview.schoolYear, overview.age ? `${overview.age} years` : ""])}`,
  ];
  if (focused === "attendance")
    lines.push(`CURRENT ATTENDANCE | ${attendance.length ? attendance.map((item) => itemLine([item.dateFrom, item.subject, `justified=${String(item.justified)}`, `reason=${text(item.reason) || "NOT RECORDED"}`])).join(" ; ") : "NO RECORDED ABSENCE"}`);
  if (focused === "assiduity")
    lines.push(`CURRENT ASSIDUITY OBSERVATIONS | ${assiduity.length ? assiduity.map((item) => itemLine([item.date, item.subject, item.label, item.comment || "NO COMMENT"])).join(" ; ") : "NONE"}`);
  if (focused === "homework")
    lines.push(`CURRENT HOMEWORK | ${homework.length ? homework.map((item) => itemLine([item.dueDate, item.subject, item.description])).join(" ; ") : "NONE"}`);
  if (focused === "exams") {
    lines.push(`CURRENT CLASS EXAMS | ${exams.length ? exams.map((item) => itemLine([item.examDate, item.subject, item.exam, item.examType])).join(" ; ") : "NONE"}`);
    lines.push(`LATEST VALID MARK PER SUBJECT (supporting context for mark-evaluation follow-ups) | ${latestMarks.length ? latestMarks.map((item) => itemLine([item.schoolYear, item.subject, `${item.rawScore}/${item.scale}`, item.examDate, item.exam])).join(" ; ") : "NONE"}`);
  }
  if (focused === "latestMarks")
    lines.push(`LATEST VALID MARK PER SUBJECT IN MOST RECENT COMPLETED YEAR | ${latestMarks.length ? latestMarks.map((item) => itemLine([item.schoolYear, item.subject, `${item.rawScore}/${item.scale}`, item.examDate, item.exam])).join(" ; ") : "NONE"}`);
  if (focused === "markDetails")
    lines.push(`EVERY VALID INDIVIDUAL MARK ON RECORD | ${markDetails.length ? markDetails.map((item) => itemLine([item.schoolYear, item.term, item.subject, item.exam, item.examDate, `${item.rawScore}/${item.scale}`, `score20=${item.score20}`])).join(" ; ") : "NONE"}`);
  if (focused === "competencies")
    lines.push(`COMPETENCY MASTERY SCORES 0..3 (WEAKEST FIRST, DEDUPLICATED) | ${competencyRows.length ? competencyRows.map((item) => itemLine([`score=${item.score}/3`, item.schoolYear, item.subject, text(item.examDate).slice(0, 10), item.competency])).join(" ; ") : "NONE"}`);
  if (focused === "teachers")
    lines.push(`CLASS TEACHERS BY SUBJECT (NAMES ONLY) | ${teachers.length ? teachers.map((item) => itemLine([item.subject, [item.firstName, item.lastName].filter(Boolean).join(" ")])).join(" ; ") : "NONE"}`);
  if (focused === "activities")
    lines.push(`STUDENT ACTIVITIES | ${activities.length ? activities.map((item) => itemLine([item.activityDate, item.activityType, item.activity, item.className])).join(" ; ") : "NONE"}`);
  if (focused === "journey")
    lines.push(`SCHOOL JOURNEY YEAR/CLASS PAIRS | ${journey.length ? journey.map((item) => itemLine([item.schoolYear, item.className, item.levelName, `current=${String(item.isCurrent)}`])).join(" ; ") : "NONE"}`);
  if (focused)
    return [
      ...lines,
      "Answer only from the requested category above. Do not mention categories absent from this focused data block.",
      focused === "competencies" && competencyRows.length
        ? "The competency evaluations listed above ARE the available data; never claim that no competency evaluations are recorded. Weakest scores are listed first."
        : "",
      focused === "journey"
        ? "The journey pairs above are the class history; keep each year paired with its recorded class."
        : "",
      focused === "exams" && !exams.length
        ? "No class exam rows exist. When the follow-up asks which evaluation produced a mark, answer from the LATEST VALID MARK line above and quote its exam label and date."
        : "",
    ]
      .filter(Boolean)
      .join("\n");

  return [
    ...lines,
    `JOURNEY YEAR/CLASS PAIRS | ${journey.map((item) => itemLine([item.schoolYear, item.className])).join(" ; ")}`,
    `INDICATIVE YEAR RESULTS /20 | ${years.map((item) => itemLine([item.schoolYear, item.average20, `${item.noteCount} valid notes`, `${item.discardedCount} discarded`])).join(" ; ")}`,
    "RESULT QUERY COVERAGE | 2023/2024 and 2024/2025 only. Missing later years were not queried and must not be described as having no results.",
    `SUBJECT RESULTS /20 | ${subjects.map((item) => itemLine([item.schoolYear, item.subject, item.average20, `${item.noteCount} notes`])).join(" ; ")}`,
    `SEMESTER RESULTS /20 | ${terms.map((item) => itemLine([item.schoolYear, item.term, item.average20, `${item.noteCount} notes`])).join(" ; ")}`,
    `CURRENT ATTENDANCE | ${attendance.length ? attendance.map((item) => itemLine([item.dateFrom, item.subject, `justified=${String(item.justified)}`, `reason=${text(item.reason) || "NOT RECORDED"}`])).join(" ; ") : "NO RECORDED ABSENCE"}`,
    `CURRENT ASSIDUITY OBSERVATIONS | ${assiduity.length ? assiduity.map((item) => itemLine([item.date, item.subject, item.label, item.comment || "NO COMMENT"])).join(" ; ") : "NONE"}`,
    `CURRENT CLASS EXAMS | ${exams.length ? exams.map((item) => itemLine([item.examDate, item.subject, item.exam, item.examType])).join(" ; ") : "NONE"}`,
    `LATEST VALID MARK PER SUBJECT IN MOST RECENT COMPLETED YEAR | ${latestMarks.length ? latestMarks.map((item) => itemLine([item.schoolYear, item.subject, `${item.rawScore}/${item.scale}`, item.examDate, item.exam])).join(" ; ") : "NONE"}`,
    `LATEST COMPLETED YEAR (${latestDetailYear}) INDIVIDUAL MARKS | ${markDetails.length ? latestYearLine : "NONE"}`,
    `EARLIER YEARS INDIVIDUAL MARKS BY SUBJECT | ${markDetails.length ? earlierYearsLine : "NONE"} (each value is rawScore/scale; full exam labels are available from read_mark_details when asked for details)`,
    `COMPETENCY MASTERY SUMMARY 0..3 | ${competencies.length ? competencySummary : "NONE"}`,
    `CLASS TEACHERS | ${teachers.length ? [...new Set(teachers.map((item) => itemLine([item.subject, [item.firstName, item.lastName].filter(Boolean).join(" ")])))].join(" ; ") : "NONE"}`,
    `STUDENT ACTIVITIES | ${activities.length ? activities.map((item) => itemLine([item.activityDate, item.activityType, item.activity])).join(" ; ") : "NONE"}`,
    `CURRENT LEARNING RECORDS | ${learning.length ? learning.map((item) => itemLine([item.date, item.subject, item.skill, item.status])).join(" ; ") : "NONE"}`,
    `CURRENT SCHOOL MESSAGES | ${messages.length ? messages.map((item) => itemLine([item.date, item.title, item.text])).join(" ; ") : "NONE"}`,
    `CURRENT HOMEWORK | ${homework.length ? homework.map((item) => itemLine([item.dueDate, item.description])).join(" ; ") : "NONE"}`,
    "Never change a year/class pair. Never infer a cause. Results above are indicative calculations, not official report-card averages.",
  ].join("\n");
}

export class ParentGroundingError extends Error {
  constructor(public readonly issues: string[]) {
    super("PARENT_GROUNDING");
  }
}

export function sanitizeParentAnswer(answer: string, lang: "fr" | "ar" = "fr") {
  const sentences = answer.split(/(?<=[.!?؟;])\s+|\n+/u);
  const kept = sentences.filter(
    (sentence) => !hasUnsupportedResultCoverageClaim(sentence),
  );
  const sanitized = (kept.join(" ").trim() || answer)
    .replace(/\(?\bOBSERVED AT\b\)?/giu, "")
    .replace(
      /\bNOT RECORDED\b/giu,
      lang === "ar" ? "غير مسجل" : "non renseigné",
    )
    .replace(
      /\bFRANCAIS\b/gu,
      lang === "ar" ? "اللغة الفرنسية" : "français",
    )
    .replace(/\b(20\d{2})-(\d{2})-(\d{2})\b/g, (_, year, month, day) => {
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      return new Intl.DateTimeFormat(lang === "ar" ? "ar-MA" : "fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
    })
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?؟])/g, "$1")
    .trim();
  return sanitized;
}

export function parentGroundingIssues(
  question: string,
  answer: string,
  facts: ParentFact[],
) {
  const q = plain(question);
  const a = plain(answer);
  const issues: string[] = [];
  const overview = dataFor(facts, "read_child_overview");
  const journey = itemsFor(facts, "read_school_journey");
  const years = itemsFor(facts, "read_year_results");
  const subjects = itemsFor(facts, "read_subject_results");
  const terms = itemsFor(facts, "read_term_results");
  const attendance = itemsFor(facts, "read_attendance");
  const assiduity = itemsFor(facts, "read_assiduity");
  const homework = itemsFor(facts, "read_homework");
  const latestMarks = itemsFor(facts, "read_latest_marks");

  if (hasUnsupportedResultCoverageClaim(a))
    issues.push(
      "do not claim that 2025/2026 or 2026/2027 has no results; those years are outside the result-query coverage",
    );

  const comparison =
    /(compar|evolution.*annee|entre.*2023\/2024.*2024\/2025)/.test(q) ||
    (q.includes("2023/2024") && q.includes("2024/2025"));
  if (comparison) {
    for (const item of years) {
      const schoolYear = text(item.schoolYear);
      if (schoolYear && !a.includes(plain(schoolYear)))
        issues.push(`mention school year ${schoolYear}`);
      if (!mentionsScore(a, item.average20))
        issues.push(`mention ${schoolYear} indicative average ${text(item.average20)}/20`);
    }

    for (const item of journey) {
      const schoolYear = plain(text(item.schoolYear));
      const expectedClass = compact(text(item.className));
      const yearPosition = a.indexOf(schoolYear);
      if (!schoolYear || !expectedClass || yearPosition < 0) continue;
      const nextYearPosition = journey
        .map((candidate) => a.indexOf(plain(text(candidate.schoolYear)), yearPosition + schoolYear.length))
        .filter((position) => position > yearPosition)
        .sort((left, right) => left - right)[0];
      const yearSegment = a.slice(
        yearPosition,
        Math.min(nextYearPosition ?? yearPosition + 90, yearPosition + 90),
      );
      const compactSegment = compact(yearSegment);
      for (const other of journey) {
        const wrongClass = compact(text(other.className));
        if (!wrongClass || wrongClass === expectedClass) continue;
        if (compactSegment.includes(wrongClass))
          issues.push(`do not pair ${text(item.schoolYear)} with ${text(other.className)}; its class is ${text(item.className)}`);
      }
    }
  }

  if (/(semestre|trimestre|periode)/.test(q)) {
    for (const item of terms)
      if (!mentionsScore(a, item.average20))
        issues.push(
          `mention ${text(item.schoolYear)} ${text(item.term)} ${text(item.average20)}/20`,
        );
  }

  if (/(progress|plus progresse|matiere.*evolu)/.test(q)) {
    const maths = subjects.filter((item) =>
      plain(text(item.subject)).includes("mathematique"),
    );
    for (const item of maths)
      if (!mentionsScore(a, item.average20))
        issues.push(
          `mention mathematics ${text(item.schoolYear)} ${text(item.average20)}/20`,
        );
  }

  if (/francais/.test(q) && /(resultat|attention|note|moyenne)/.test(q)) {
    const french = subjects.filter((item) =>
      plain(text(item.subject)).includes("francais"),
    );
    for (const item of french)
      if (!mentionsScore(a, item.average20))
        issues.push(
          `mention French ${text(item.schoolYear)} ${text(item.average20)}/20`,
        );
  }

  if (/(absence|absent|justifi|motif)/.test(q) && attendance.length) {
    const item = attendance[0];
    const day = text(item.dateFrom);
    if (day && !mentionsDate(a, day))
      issues.push(`mention absence date ${day}`);
    const subject = plain(text(item.subject));
    if (subject && !a.includes(subject))
      issues.push(`mention absence subject ${text(item.subject)}`);
    if (
      item.justified === false &&
      !/((non|pas)[\s-]*justifie|injustifie|justified\s*=\s*false)/.test(a)
    )
      issues.push("state that the absence is recorded as not justified");
    if (/motif/.test(q) && text(item.reason) === "" && !/(motif.*(non|pas)|aucun motif|n'est pas renseigne|ne.*indique)/.test(a))
      issues.push("state that no textual reason is recorded");
  }

  if (
    !multiYearIntent(q) &&
    /(derniere|dernieres|recent).{0,35}note|note.{0,35}(derniere|annee derniere)/.test(q)
  ) {
    for (const item of latestMarks) {
      const subject = plain(text(item.subject));
      if (subject && !a.includes(subject))
        issues.push(`mention latest-mark subject ${text(item.subject)}`);
      if (!mentionsScore(a, item.rawScore))
        issues.push(`mention latest raw mark ${text(item.rawScore)} for ${text(item.subject)}`);
      const year = text(item.schoolYear);
      if (year && !a.includes(year))
        issues.push(`mention latest-mark school year ${year}`);
    }
  }

  if (/(assiduite|assidu)/.test(q) && assiduity.length === 0) {
    if (!/(aucun|aucune|pas de|non enregistre).{0,40}(observation|enregistrement).{0,30}assiduite|assiduite.{0,40}(aucun|aucune|pas de|non enregistre)/.test(a))
      issues.push("state only that no assiduity observation is recorded");
    if (/(aucun|aucune|pas de).{0,35}(retard|absence|difficulte|incident)/.test(a))
      issues.push("do not infer that there were no delays, absences, difficulties or incidents from an empty assiduity view");
  }

  if (/(devoir|travail.{0,20}(demain|maison))/.test(q) && homework.length === 0 && !/(aucun|aucune|pas de|non publie|non enregistre)/.test(a))
    issues.push("state that no homework is published in the authorised view");

  if (/(comment va|globalement|bilan global)/.test(q)) {
    const child = compact(text(overview.child));
    const className = compact(text(overview.className));
    const compactAnswer = compact(a);
    if (child && !compactAnswer.includes(child))
      issues.push(`mention child ${text(overview.child)}`);
    if (className && !compactAnswer.includes(className))
      issues.push(`mention current class ${text(overview.className)}`);
    if (attendance.length && !a.includes("absence"))
      issues.push("mention the current recorded absence");
  }

  if (
    /(trois|3).{0,35}action/.test(q) &&
    /(maison|accompagn)/.test(q)
  ) {
    if (
      !/(^|\s)1[.)]/m.test(a) ||
      !/(^|\s)2[.)]/m.test(a) ||
      !/(^|\s)3[.)]/m.test(a)
    )
      issues.push("provide exactly three clearly numbered practical actions");
    if (!/(maison|lecture|lire|exercice|routine|entrain|jeu)/.test(a))
      issues.push("make the three actions concrete enough to do at home");
  }

  return [...new Set(issues)];
}
