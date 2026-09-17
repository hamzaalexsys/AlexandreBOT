import { env } from "cloudflare:workers";
import type { Session } from "../auth/session";
import type { Language } from "@/lib/contracts";
import { createSchoolGatewayClient } from "./gateway-client";

export type SchoolRead =
  | "overview"
  | "learning"
  | "attendance"
  | "assiduity"
  | "messages"
  | "homework"
  | "exams"
  | "latestMarks"
  | "markDetails"
  | "competencies"
  | "teachers"
  | "activities"
  | "journey"
  | "yearResults"
  | "subjectResults"
  | "termResults";

export interface SchoolRepository {
  read(section: SchoolRead, session: Session, lang: Language): Promise<unknown>;
}

const source = "Base scolaire Alexandre · lecture seule";
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : value == null ? "" : String(value);
const date = (value: unknown) => {
  const raw = text(value);
  return raw ? raw.slice(0, 10) : "";
};
const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const ageAt = (value: unknown) => {
  const born = new Date(text(value));
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  if (
    now.getUTCMonth() < born.getUTCMonth() ||
    (now.getUTCMonth() === born.getUTCMonth() &&
      now.getUTCDate() < born.getUTCDate())
  )
    age--;
  return age >= 5 && age <= 22 ? age : null;
};

const liveRepository: SchoolRepository = {
  async read(section, session, lang) {
    if (
      session.role !== "parent" ||
      session.mode !== "pilot" ||
      !session.enrollmentId
    )
      throw new Error("PILOT_IDENTITY_REQUIRED");
    const config = env as Record<string, string | undefined>;
    if (!config.SCHOOL_GATEWAY_URL || !config.SCHOOL_GATEWAY_TOKEN)
      throw new Error("SCHOOL_NOT_CONFIGURED");
    const client = createSchoolGatewayClient({
      endpoint: config.SCHOOL_GATEWAY_URL,
      token: config.SCHOOL_GATEWAY_TOKEN,
    });
    const identity = {
      mode: "pilot" as const,
      subject: session.subject,
      enrollmentId: session.enrollmentId,
    };
    if (section === "overview") {
      const result = await client.read("children", identity);
      const row = result.items.find(
        (item) => Number(item.enrollmentId) === session.enrollmentId,
      );
      if (!row) throw new Error("SCHOOL_SCOPE_EMPTY");
      return {
        source,
        observedAt: result.readAt,
        child:
          lang === "ar" && text(row.firstNameAr)
            ? text(row.firstNameAr)
            : text(row.firstName),
        className: text(row.className),
        schoolYear: text(row.schoolYear),
        period: text(row.schoolYear),
        age: ageAt(row.dateOfBirth),
      };
    }
    const result = await client.read(section, identity);
    const common = { source, observedAt: result.readAt };
    if (section === "learning")
      return {
        ...common,
        items: result.items.map((item) => ({
          subject: text(item.subject),
          skill: text(item.skill),
          status: text(item.status),
          date: date(item.observedAt),
        })),
      };
    if (section === "attendance") {
      const items = result.items.map((item) => ({
        dateFrom: date(item.dateFrom),
        dateTo: date(item.dateTo),
        subject: text(item.subject),
        label: text(item.label),
        justified:
          item.justified == null ? null : Number(item.justified) === 1,
        reason: text(item.label),
      }));
      return {
        ...common,
        items,
        note:
          items.length === 0
            ? lang === "fr"
              ? "Aucune absence enregistrée pour cette année scolaire."
              : "لا يوجد غياب مسجّل خلال هذه السنة الدراسية."
            : lang === "fr"
              ? `${items.length} absence${items.length > 1 ? "s" : ""} enregistrée${items.length > 1 ? "s" : ""} cette année scolaire.`
              : `عدد حالات الغياب المسجّلة هذه السنة: ${items.length}.`,
      };
    }
    if (section === "assiduity") {
      const items = result.items.map((item) => ({
        date: date(item.observedAt),
        subject: text(item.subject),
        label: text(item.label),
        comment: text(item.comment),
      }));
      return {
        ...common,
        items,
        note:
          items.length === 0
            ? lang === "fr"
              ? "Aucun enregistrement d’assiduité pour cette année scolaire."
              : "لا توجد ملاحظة مواظبة مسجلة خلال هذه السنة الدراسية."
            : lang === "fr"
              ? `${items.length} enregistrement${items.length > 1 ? "s" : ""} d’assiduité cette année.`
              : `عدد ملاحظات المواظبة المسجلة هذه السنة: ${items.length}.`,
      };
    }
    if (section === "messages")
      return {
        ...common,
        items: result.items.map((item) => ({
          title: text(item.title),
          text: text(item.text),
          date: date(item.observedAt),
        })),
      };
    if (section === "homework")
      return {
        ...common,
        items: result.items.map((item) => ({
          description: text(item.description),
          publishedAt: date(item.publishedAt),
          dueDate: date(item.dueDate),
          subject: text(item.subject),
          documentType: text(item.documentType),
        })),
      };
    if (section === "exams")
      return {
        ...common,
        items: result.items.map((item) => ({
          examDate: date(item.examDate),
          exam: text(item.exam),
          subject: text(item.subject),
          examType: text(item.examType),
          term: text(item.term),
          schoolYear: text(item.schoolYear),
        })),
      };
    if (section === "latestMarks")
      return {
        ...common,
        items: result.items.map((item) => ({
          schoolYear: text(item.schoolYear),
          subject: text(item.subject),
          exam: text(item.exam),
          examDate: date(item.examDate),
          rawScore: number(item.rawScore),
          scale: number(item.scale),
          score20: number(item.score20),
        })),
      };
    if (section === "markDetails")
      return {
        ...common,
        scaleNote:
          lang === "fr"
            ? "Chaque note individuelle valide est ramenée sur 20 ; les notes au-delà de 250 lignes ne sont pas renvoyées."
            : "كل نقطة فردية صالحة محولة إلى 20؛ النقاط بعد 250 سطراً غير مرجعة.",
        items: result.items.map((item) => ({
          schoolYear: text(item.schoolYear),
          term: text(item.term),
          subject: text(item.subject),
          exam: text(item.exam),
          examDate: date(item.examDate),
          rawScore: number(item.rawScore),
          scale: number(item.scale),
          score20: number(item.score20),
        })),
      };
    if (section === "competencies")
      return {
        ...common,
        scaleNote:
          lang === "fr"
            ? "Chaque compétence est évaluée sur une échelle de 0 (non maîtrisée) à 3 (maîtrisée) lors d’un examen. L’année scolaire est déduite de la date de l’examen (septembre à août)."
            : "كل كفاءة يتم تقييمها على سلم من 0 (غير مكتسبة) إلى 3 (مكتسبة) خلال اختبار. السنة الدراسية مستنتجة من تاريخ الاختبار (من شتنبر إلى غشت).",
        items: result.items.map((item) => ({
          schoolYear: text(item.schoolYear),
          subject: text(item.subject),
          competency: text(item.competency),
          code: text(item.code),
          recurring: item.recurring == null ? null : Number(item.recurring) === 1,
          examDate: date(item.examDate),
          score: number(item.score),
        })),
      };
    if (section === "teachers")
      return {
        ...common,
        method:
          lang === "fr"
            ? "Enseignants de la classe actuelle par matière (nom uniquement, sans coordonnées)."
            : "أساتذة القسم الحالي حسب المادة (الاسم فقط، بدون معلومات الاتصال).",
        items: result.items.map((item) => ({
          className: text(item.className),
          subject: text(item.subject),
          lastName: text(item.lastName),
          firstName: text(item.firstName),
        })),
      };
    if (section === "activities")
      return {
        ...common,
        items: result.items.map((item) => ({
          schoolYear: text(item.schoolYear),
          activityType: text(item.activityType),
          activity: text(item.activity),
          activityDate: date(item.activityDate),
          className: text(item.className),
        })),
      };
    if (section === "journey")
      return {
        ...common,
        items: result.items.map((item) => ({
          schoolYear: text(item.schoolYear),
          className: text(item.className),
          levelName: text(item.levelName),
          isCurrent: Number(item.isCurrent) === 1,
        })),
      };
    if (section === "yearResults")
      return {
        ...common,
        scale: 20,
        method:
          lang === "fr"
            ? "Lecture limitée à 2023/2024 et 2024/2025. Moyennes indicatives calculées à partir des notes d’examens valides et ramenées sur 20 ; ce ne sont pas des moyennes officielles de bulletin. L’absence d’une autre année dans cette lecture ne signifie pas qu’elle ne possède aucun résultat."
            : "القراءة محدودة بالسنتين 2023/2024 و2024/2025. متوسطات إرشادية محسوبة من نتائج الاختبارات الصالحة ومحولة إلى 20؛ وليست معدلات رسمية لكشف النقط. غياب سنة أخرى من هذه القراءة لا يعني عدم وجود نتائج لها.",
        coveredYears: ["2023/2024", "2024/2025"],
        items: result.items.map((item) => ({
          schoolYear: text(item.schoolYear),
          noteCount: number(item.noteCount),
          average20: number(item.average20),
          minimum20: number(item.minimum20),
          maximum20: number(item.maximum20),
          discardedCount: number(item.discardedCount),
        })),
      };
    if (section === "subjectResults")
      return {
        ...common,
        scale: 20,
        items: result.items.map((item) => ({
          schoolYear: text(item.schoolYear),
          subject: text(item.subject),
          noteCount: number(item.noteCount),
          average20: number(item.average20),
        })),
      };
    return {
      ...common,
      scale: 20,
      items: result.items.map((item) => ({
        schoolYear: text(item.schoolYear),
        term: text(item.term),
        noteCount: number(item.noteCount),
        average20: number(item.average20),
      })),
    };
  },
};

export function repositoryFor(session: Session): SchoolRepository {
  if (session.mode === "pilot") return liveRepository;
  throw new Error("PILOT_IDENTITY_REQUIRED");
}
