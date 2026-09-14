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

const cleanDataText = (value: unknown) =>
  text(value).replace(/\s+/g, " ").slice(0, 400);

const itemLine = (parts: unknown[]) =>
  parts.map(cleanDataText).filter(Boolean).join(" | ");

export function parentFactDigest(facts: ParentFact[]) {
  const overview = dataFor(facts, "read_child_overview");
  const journey = itemsFor(facts, "read_school_journey");
  const years = itemsFor(facts, "read_year_results");
  const subjects = itemsFor(facts, "read_subject_results");
  const terms = itemsFor(facts, "read_term_results");
  const attendance = itemsFor(facts, "read_attendance");
  const learning = itemsFor(facts, "read_learning");
  const messages = itemsFor(facts, "read_school_messages");
  const homework = itemsFor(facts, "read_homework");

  return [
    `OBSERVED AT | ${text(overview.observedAt)}`,
    `CURRENT CHILD | ${itemLine([overview.child, overview.className, overview.schoolYear, overview.age ? `${overview.age} years` : ""])}`,
    `JOURNEY YEAR/CLASS PAIRS | ${journey.map((item) => itemLine([item.schoolYear, item.className])).join(" ; ")}`,
    `INDICATIVE YEAR RESULTS /20 | ${years.map((item) => itemLine([item.schoolYear, item.average20, `${item.noteCount} valid notes`, `${item.discardedCount} discarded`])).join(" ; ")}`,
    "RESULT QUERY COVERAGE | 2023/2024 and 2024/2025 only. Missing later years were not queried and must not be described as having no results.",
    `SUBJECT RESULTS /20 | ${subjects.map((item) => itemLine([item.schoolYear, item.subject, item.average20, `${item.noteCount} notes`])).join(" ; ")}`,
    `SEMESTER RESULTS /20 | ${terms.map((item) => itemLine([item.schoolYear, item.term, item.average20, `${item.noteCount} notes`])).join(" ; ")}`,
    `CURRENT ATTENDANCE | ${attendance.length ? attendance.map((item) => itemLine([item.dateFrom, item.subject, `justified=${String(item.justified)}`, `reason=${text(item.reason) || "NOT RECORDED"}`])).join(" ; ") : "NO RECORDED ABSENCE"}`,
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
    if (day && !a.includes(day) && !a.includes("14 septembre"))
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
