"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Database,
  GraduationCap,
  HeartHandshake,
  History,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AlexandreAvatar } from "./avatars";
import type { Language } from "@/lib/contracts";
import type { ParentFocus } from "@/lib/parent-focus";

type Score = {
  schoolYear: string;
  noteCount: number | null;
  average20: number | null;
};

type SchoolData = {
  overview: {
    source: string;
    child: string;
    className: string;
    age: number | null;
    period: string;
    schoolYear: string;
    observedAt: string;
  };
  learning: {
    items: { subject: string; skill: string; status: string; date: string }[];
  };
  attendance: {
    note: string;
    items: {
      dateFrom: string;
      dateTo: string;
      subject: string;
      label: string;
      justified: boolean | null;
      reason: string;
    }[];
  };
  messages: { items: { title: string; text: string; date: string }[] };
  homework: { items: { description: string; dueDate: string }[] };
  journey: {
    items: {
      schoolYear: string;
      className: string;
      levelName: string;
      isCurrent: boolean;
    }[];
  };
  yearResults: {
    method: string;
    items: (Score & {
      minimum20: number | null;
      maximum20: number | null;
      discardedCount: number | null;
    })[];
  };
  subjectResults: { items: (Score & { subject: string })[] };
  termResults: { items: (Score & { term: string })[] };
};

export function ParentOverview({
  lang,
  onAsk,
  busy,
  focus,
}: {
  lang: Language;
  onAsk: (text: string) => void;
  busy: boolean;
  focus: ParentFocus;
}) {
  const t = (fr: string, ar: string) => (lang === "fr" ? fr : ar);
  const [data, setData] = useState<SchoolData | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const formatDate = (value: string) =>
    value
      ? new Date(`${value}T12:00:00`).toLocaleDateString(
          lang === "ar" ? "ar-MA" : "fr-FR",
          { day: "numeric", month: "short", year: "numeric" },
        )
      : t("date non renseignée", "التاريخ غير متوفر");
  const formatScore = (value: number | null) =>
    value == null
      ? "—"
      : new Intl.NumberFormat(lang === "ar" ? "ar-MA" : "fr-FR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 2,
        }).format(value);

  useEffect(() => {
    const abort = new AbortController();
    fetch(`/api/child?lang=${lang}`, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("SCHOOL_UNAVAILABLE");
        setData((await response.json()) as SchoolData);
        setError(false);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      });
    return () => abort.abort();
  }, [lang, reload]);

  const derived = useMemo(() => {
    if (!data)
      return {
        journey: [],
        year2023: undefined,
        year2024: undefined,
        subjects: [],
      };
    const previousBySubject = new Map(
      data.subjectResults.items
        .filter((item) => item.schoolYear === "2023/2024")
        .map((item) => [item.subject, item]),
    );
    const subjects = data.subjectResults.items
      .filter((item) => item.schoolYear === "2024/2025")
      .map((item) => {
        const previous = previousBySubject.get(item.subject);
        return {
          ...item,
          previous,
          delta:
            item.average20 != null && previous?.average20 != null
              ? item.average20 - previous.average20
              : null,
        };
      });
    return {
      journey: [...data.journey.items].reverse(),
      year2023: data.yearResults.items.find(
        (item) => item.schoolYear === "2023/2024",
      ),
      year2024: data.yearResults.items.find(
        (item) => item.schoolYear === "2024/2025",
      ),
      subjects,
    };
  }, [data]);

  if (error)
    return (
      <div className="panel-empty">
        <p>{t("Le dossier n’a pas pu être chargé.", "تعذّر تحميل الملف.")}</p>
        <button onClick={() => setReload((value) => value + 1)}>
          <RefreshCw size={17} />
          {t("Réessayer", "إعادة المحاولة")}
        </button>
      </div>
    );
  if (!data)
    return (
      <div className="panel-empty" role="status">
        {t("Alexandre prépare votre aperçu…", "ألكسندر يجهّز ملخّصكم…")}
      </div>
    );

  const child = data.overview.child || t("Votre enfant", "طفلكم");
  const initial = Array.from(child)[0]?.toLocaleUpperCase() || "A";
  const absences = data.attendance.items.length;
  const context = {
    summary: {
      label: t("VUE D’ENSEMBLE", "نظرة عامة"),
      title: t(`Comprendre ${child}`, `فهم وضع ${child}`),
      text: t(
        "Les faits importants du dossier, réunis sans tirer de conclusion sur son état émotionnel.",
        "أهم معطيات الملف مجمعة دون استنتاج حالته النفسية.",
      ),
      icon: HeartHandshake,
    },
    journey: {
      label: t("PARCOURS SCOLAIRE", "المسار الدراسي"),
      title: t("Année après année", "سنة بعد سنة"),
      text: t(
        "Les classes réellement enregistrées dans le dossier scolaire.",
        "الأقسام المسجلة فعلياً في الملف المدرسي.",
      ),
      icon: History,
    },
    results: {
      label: t("RÉSULTATS ET TENDANCES", "النتائج والتطور"),
      title: t("Lire les notes avec leur contexte", "قراءة النقط في سياقها"),
      text: t(
        "Des calculs indicatifs sur 20, accompagnés du nombre de notes utilisées.",
        "حسابات إرشادية على 20 مع عدد النقط المستخدمة.",
      ),
      icon: BarChart3,
    },
    attendance: {
      label: t("PRÉSENCE", "الحضور"),
      title: t("Ce qui est enregistré", "ما هو مسجل"),
      text: t(
        "Date, matière et statut de justification, sans inventer de motif.",
        "التاريخ والمادة وحالة التبرير دون اختلاق السبب.",
      ),
      icon: CalendarDays,
    },
    records: {
      label: t("DOSSIER COURANT", "الملف الحالي"),
      title: t("Les informations de l’école", "معلومات المدرسة"),
      text: t(
        "Observations, messages et devoirs disponibles pour l’année en cours.",
        "الملاحظات والرسائل والواجبات المتاحة للسنة الحالية.",
      ),
      icon: ClipboardList,
    },
    support: {
      label: t("PRÉPARER L’ÉCHANGE", "الاستعداد للحوار"),
      title: t("Passer des faits aux bonnes questions", "تحويل المعطيات إلى أسئلة مفيدة"),
      text: t(
        "Des pistes de discussion fondées sur les résultats, à confirmer avec l’enseignant.",
        "محاور للنقاش مبنية على النتائج وتُؤكّد مع الأستاذ.",
      ),
      icon: MessageCircle,
    },
  }[focus];
  const FocusIcon = context.icon;

  return (
    <div className="parent-overview">
      <section className="parent-greeting">
        <div>
          <div className="eyebrow start">{context.label}</div>
          <h2>
            {context.title}
            <br />
            <em>{t("avec Alexandre.", "مع ألكسندر.")}</em>
          </h2>
          <p>{context.text}</p>
          <button
            disabled={busy}
            className="green-button"
            onClick={() =>
              onAsk(
                t(
                  `Comment va ${child} ? Fais-moi un point factuel à partir de toutes les données disponibles.`,
                  `كيف حال ${child}؟ أعطني ملخصاً واقعياً من كل البيانات المتاحة.`,
                ),
              )
            }
          >
            {t("Faire le point", "مراجعة الوضع")}
            <ArrowUpRight size={18} />
          </button>
        </div>
        <AlexandreAvatar speaking={busy} />
      </section>

      <section className="child-profile">
        <div className="child-initial">
          {initial}
          <span>✿</span>
        </div>
        <div>
          <h3>{child}</h3>
          <p>
            {data.overview.className}
            {data.overview.age
              ? ` · ${data.overview.age} ${t("ans", "سنة")}`
              : ""}
            {data.overview.schoolYear ? ` · ${data.overview.schoolYear}` : ""}
          </p>
        </div>
        <span className="demo-chip">
          <Database size={13} />
          {t("SQL réel · lecture seule", "بيانات فعلية · قراءة فقط")}
        </span>
      </section>

      <section className={`parent-context parent-context-${focus}`} key={focus}>
        <header className="context-heading">
          <span>
            <FocusIcon size={21} />
          </span>
          <div>
            <small>{context.label}</small>
            <h3>{context.title}</h3>
          </div>
        </header>

        {focus === "summary" ? (
          <div className="summary-grid">
            <article>
              <GraduationCap size={20} />
              <small>{t("CLASSE ACTUELLE", "القسم الحالي")}</small>
              <strong>{data.overview.className}</strong>
              <span>{data.overview.schoolYear}</span>
            </article>
            <article>
              <History size={20} />
              <small>{t("PARCOURS", "المسار")}</small>
              <strong>
                {derived.journey.length} {t("années", "سنوات")}
              </strong>
              <span>{t("Dossier continu", "ملف متواصل")}</span>
            </article>
            <article>
              <BarChart3 size={20} />
              <small>2024/2025</small>
              <strong>{formatScore(derived.year2024?.average20 ?? null)}/20</strong>
              <span>
                {derived.year2024?.noteCount ?? 0} {t("notes valides", "نقطة صالحة")}
              </span>
            </article>
            <article className={absences ? "attention" : ""}>
              <CalendarDays size={20} />
              <small>{t("PRÉSENCE ACTUELLE", "الحضور الحالي")}</small>
              <strong>
                {absences} {t(absences === 1 ? "absence" : "absences", "غياب")}
              </strong>
              <span>{data.overview.schoolYear}</span>
            </article>
          </div>
        ) : null}

        {focus === "journey" ? (
          <ol className="journey-list">
            {derived.journey.map((item) => (
              <li key={item.schoolYear} className={item.isCurrent ? "current" : ""}>
                <span className="journey-dot" />
                <div>
                  <small>{item.schoolYear}</small>
                  <strong>{item.className || item.levelName}</strong>
                </div>
                {item.isCurrent ? <em>{t("Aujourd’hui", "حالياً")}</em> : null}
              </li>
            ))}
          </ol>
        ) : null}

        {focus === "results" ? (
          <>
            <div className="year-comparison">
              {[derived.year2023, derived.year2024].map((item) =>
                item ? (
                  <article key={item.schoolYear}>
                    <small>{item.schoolYear}</small>
                    <strong>{formatScore(item.average20)}/20</strong>
                    <span>
                      {item.noteCount} {t("notes valides", "نقطة صالحة")}
                    </span>
                  </article>
                ) : null,
              )}
              <div
                className="comparison-arrow"
                aria-label={t("Évolution", "التطور")}
              >
                <ArrowUpRight size={20} />
                <strong>
                  {derived.year2023?.average20 != null &&
                  derived.year2024?.average20 != null
                    ? formatScore(
                        derived.year2024.average20 -
                          derived.year2023.average20,
                      )
                    : "—"}
                </strong>
              </div>
            </div>
            <div className="subject-results">
              {derived.subjects.map((item) => (
                <article key={item.subject}>
                  <div className="subject-line">
                    <strong>{item.subject}</strong>
                    <span>
                      {formatScore(item.previous?.average20 ?? null)} → {formatScore(item.average20)}
                    </span>
                  </div>
                  <progress
                    max={20}
                    value={item.average20 ?? 0}
                    aria-label={`${item.subject} ${formatScore(item.average20)} sur 20`}
                  />
                  <small>
                    {item.noteCount} {t("notes en 2024/2025", "نقطة في 2024/2025")}
                    {item.delta != null
                      ? ` · ${item.delta >= 0 ? "+" : ""}${formatScore(item.delta)}`
                      : ""}
                  </small>
                </article>
              ))}
            </div>
            <div className="term-strip">
              {data.termResults.items.map((item) => (
                <span key={`${item.schoolYear}-${item.term}`}>
                  <small>
                    {item.schoolYear} · {item.term}
                  </small>
                  <strong>{formatScore(item.average20)}/20</strong>
                </span>
              ))}
            </div>
            <p className="method-note">
              <ShieldCheck size={15} />
              {data.yearResults.method}
            </p>
          </>
        ) : null}

        {focus === "attendance" ? (
          <div className="attendance-detail">
            {data.attendance.items.length ? (
              data.attendance.items.map((item, index) => (
                <article key={`${item.dateFrom}-${item.subject}-${index}`}>
                  <span className="attendance-date">
                    <CalendarDays size={20} />
                  </span>
                  <div>
                    <small>{formatDate(item.dateFrom)}</small>
                    <strong>
                      {item.subject ||
                        t("Matière non renseignée", "المادة غير متوفرة")}
                    </strong>
                    <p>
                      {item.justified === true
                        ? t("Absence marquée justifiée", "الغياب مسجل كمبرر")
                        : item.justified === false
                          ? t(
                              "Absence marquée non justifiée",
                              "الغياب مسجل كغير مبرر",
                            )
                          : t(
                              "Statut de justification non renseigné",
                              "حالة التبرير غير متوفرة",
                            )}
                    </p>
                    <em>
                      {item.reason ||
                        t(
                          "Aucun motif textuel n’est enregistré.",
                          "لا يوجد سبب مكتوب مسجل.",
                        )}
                    </em>
                  </div>
                </article>
              ))
            ) : (
              <p className="data-empty">{data.attendance.note}</p>
            )}
          </div>
        ) : null}

        {focus === "records" ? (
          <div className="records-grid">
            <article>
              <BookOpen size={20} />
              <strong>{t("Observations pédagogiques", "الملاحظات التربوية")}</strong>
              <span>{data.learning.items.length}</span>
              <p>
                {data.learning.items.length
                  ? t("Éléments disponibles", "بيانات متاحة")
                  : t("Aucune observation actuelle", "لا توجد ملاحظة حالية")}
              </p>
            </article>
            <article>
              <MessageCircle size={20} />
              <strong>{t("Messages de l’école", "رسائل المدرسة")}</strong>
              <span>{data.messages.items.length}</span>
              <p>
                {data.messages.items.length
                  ? t("Messages disponibles", "رسائل متاحة")
                  : t("Aucun message actuel", "لا توجد رسالة حالية")}
              </p>
            </article>
            <article>
              <ClipboardList size={20} />
              <strong>{t("Devoirs récents", "الواجبات الحديثة")}</strong>
              <span>{data.homework.items.length}</span>
              <p>
                {data.homework.items.length
                  ? t("Travail enregistré", "واجبات مسجلة")
                  : t("Aucun devoir actuel", "لا يوجد واجب حالي")}
              </p>
            </article>
          </div>
        ) : null}

        {focus === "support" ? (
          <div className="support-panel">
            <div className="support-facts">
              <article>
                <Sparkles size={19} />
                <div>
                  <small>{t("À valoriser", "نقطة قوة")}</small>
                  <strong>
                    {t("La progression en mathématiques", "التقدم في الرياضيات")}
                  </strong>
                </div>
              </article>
              <article>
                <HeartHandshake size={19} />
                <div>
                  <small>{t("À clarifier", "نقطة للنقاش")}</small>
                  <strong>{t("L’évolution en français", "تطور النتائج في الفرنسية")}</strong>
                </div>
              </article>
            </div>
            <p>
              {t(
                "Les notes montrent où poser des questions ; elles n’expliquent pas, à elles seules, la cause d’une évolution.",
                "توضح النقط أين نطرح الأسئلة، لكنها لا تفسر وحدها سبب أي تغير.",
              )}
            </p>
            <div className="support-actions">
              <button
                disabled={busy}
                onClick={() =>
                  onAsk(
                    t(
                      "Quelles questions devrais-je poser à son professeur de français ?",
                      "ما الأسئلة التي أطرحها على أستاذ الفرنسية؟",
                    ),
                  )
                }
              >
                {t("Préparer les questions", "إعداد الأسئلة")}
                <ArrowUpRight size={16} />
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  onAsk(
                    t(
                      "Donne-moi trois actions simples pour l’accompagner à la maison, fondées uniquement sur ses résultats.",
                      "أعطني ثلاث خطوات بسيطة لمساعدته في البيت اعتماداً على نتائجه فقط.",
                    ),
                  )
                }
              >
                {t("Agir à la maison", "المساعدة في البيت")}
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <p className="parent-footnote">
        <Database size={16} />
        {t(
          `Source : ${data.overview.source}. Les données scolaires ne permettent pas, à elles seules, de déduire l’état émotionnel de ${child}.`,
          `المصدر: ${data.overview.source}. لا تسمح البيانات المدرسية وحدها باستنتاج الحالة النفسية لـ${child}.`,
        )}
      </p>
    </div>
  );
}
