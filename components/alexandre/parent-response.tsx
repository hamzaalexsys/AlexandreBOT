import { BookOpenCheck, CalendarDays, CheckCircle2, CircleAlert } from "lucide-react";
import type { Language, ParentPresentation } from "@/lib/contracts";

export function ParentResponse({
  presentation,
  lang,
}: {
  presentation: ParentPresentation;
  lang: Language;
}) {
  if (presentation.kind === "table")
    return (
      <section className="parent-response-card parent-response-table" aria-label={presentation.title}>
        <header>
          <BookOpenCheck size={18} />
          <div>
            <h3>{presentation.title}</h3>
            {presentation.caption ? <p>{presentation.caption}</p> : null}
          </div>
        </header>
        <div className="parent-table-scroll">
          <table>
            <thead>
              <tr>
                {presentation.columns.map((column) => (
                  <th key={column} scope="col">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {presentation.rows.length ? (
                presentation.rows.map((row, rowIndex) => (
                  <tr key={`${rowIndex}-${row.join("-")}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${cellIndex}-${cell}`}>{cell}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={presentation.columns.length} className="parent-table-empty">
                    {lang === "fr" ? "Aucune donnée enregistrée." : "لا توجد بيانات مسجلة."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );

  if (presentation.kind === "timeline")
    return (
      <section className="parent-response-card parent-response-timeline" aria-label={presentation.title}>
        <header>
          <CalendarDays size={18} />
          <div>
            <h3>{presentation.title}</h3>
            {presentation.caption ? <p>{presentation.caption}</p> : null}
          </div>
        </header>
        <div className="parent-timeline-list">
          {presentation.items.map((item, index) => (
            <article key={`${item.date}-${item.title}-${index}`} className={item.tone}>
              <span className="parent-timeline-dot" />
              <time>{item.date}</time>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    );

  if (presentation.kind === "tasks")
    return (
      <section className="parent-response-card parent-response-tasks" aria-label={presentation.title}>
        <header>
          <BookOpenCheck size={18} />
          <div>
            <h3>{presentation.title}</h3>
            {presentation.caption ? <p>{presentation.caption}</p> : null}
          </div>
        </header>
        <div className="parent-task-list">
          {presentation.items.map((item, index) => (
            <article key={`${item.dueDate}-${item.subject}-${index}`}>
              <span>{item.dueDate}</span>
              <strong>{item.subject}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    );

  return (
    <section className="parent-response-card parent-response-empty" aria-label={presentation.title}>
      <CheckCircle2 size={22} />
      <div>
        <h3>{presentation.title}</h3>
        <p>{presentation.detail}</p>
      </div>
      <CircleAlert className="sr-only" />
    </section>
  );
}
