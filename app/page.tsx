"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Globe2,
  ShieldCheck,
  BookOpen,
  Heart,
} from "lucide-react";
import { AlexandreAvatar } from "@/components/alexandre/avatars";
import { Workspace } from "@/components/alexandre/workspace";
import type { Language, Role } from "@/lib/contracts";
export default function Home() {
  const [lang, setLang] = useState<Language>("fr");
  const [role, setRole] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sessionVersion = useRef(0);
  useEffect(() => {
    const version = ++sessionVersion.current;
    const abort = new AbortController();
    fetch("/api/session", { signal: abort.signal })
      .then(async (r) => {
        if (r.ok) {
          const data = (await r.json()) as { role: Role };
          if (
            version === sessionVersion.current &&
            ["student", "parent"].includes(data.role)
          )
            setRole(data.role);
        }
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const t = (fr: string, ar: string) => (lang === "fr" ? fr : ar);
  async function enter(next: Role) {
    ++sessionVersion.current;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      if (!response.ok) throw new Error();
      setRole(next);
    } catch {
      setError(
        t(
          "La connexion est indisponible. Réessaie dans un instant.",
          "الاتصال غير متاح. حاول مرة أخرى بعد قليل.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  if (role)
    return (
      <Workspace
        role={role}
        lang={lang}
        setLang={setLang}
        onExit={async () => {
          ++sessionVersion.current;
          await fetch("/api/session", { method: "DELETE" });
          sessionStorage.removeItem("alexandrebot.student.entry");
          setRole(null);
        }}
      />
    );
  return (
    <div className="entry" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <header className="entry-header">
        <Brand />
        <button
          className="language-button"
          onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
        >
          <Globe2 size={18} />
          {lang === "fr" ? "العربية" : "Français"}
        </button>
      </header>
      <main className="welcome">
        <div className="eyebrow">
          <span />
          {t("GROUPE SCOLAIRE ALEXANDRE", "مجموعة مدارس ألكسندر")}
        </div>
        <h1>
          {t("Un petit clic.", "نقرة صغيرة.")}
          <br />
          <em>{t("De grandes découvertes.", "واكتشافات كبيرة.")}</em>
          <span className="title-spark">✳</span>
        </h1>
        <p className="welcome-intro">
          {t(
            "Un compagnon pour apprendre. Un lien pour mieux accompagner.",
            "رفيق للتعلّم. وصلة لفهم طفلك ومرافقته.",
          )}
        </p>
        <div className="role-grid single">
          <button
            className="role-card parent-choice"
            disabled={busy}
            onClick={() => enter("parent")}
          >
            <div className="role-top">
              <span className="pill">
                <Heart size={14} />
                {t("L’ESPACE FAMILLE", "فضاء العائلة")}
              </span>
              <ArrowUpRight />
            </div>
            <div className="avatar-stage">
              <span className="doodle d1">✦</span>
              <AlexandreAvatar />
              <span className="doodle d3">♡</span>
            </div>
            <h2>{t("Je suis parent", "أنا وليّ أمر")}</h2>
            <p>
              {t(
                "Alexandre vous aide à comprendre le quotidien de votre enfant.",
                "يساعدكم ألكسندر على فهم الحياة المدرسية لطفلكم.",
              )}
            </p>
            <div className="role-action">
              {t("Rencontrer Alexandre", "لقاء ألكسندر")}
              <ArrowRight size={19} />
            </div>
          </button>
        </div>
        <div className="entry-note">
          <ShieldCheck size={17} />
          {t(
            "Connexion locale de test · Aucun mot de passe réel",
            "دخول محلي للتجربة · دون كلمة مرور حقيقية",
          )}
        </div>
        {busy ? (
          <p role="status">{t("On prépare ton espace…", "نجهّز فضاءك…")}</p>
        ) : null}
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
      </main>
      <footer className="entry-footer">
        <span>{t("Grandir ensemble, chaque jour.", "نكبر معاً، كل يوم.")}</span>
        <span>
          <BookOpen size={16} />
          {t("6–12 ans · Français & العربية", "٦–١٢ سنة · العربية والفرنسية")}
        </span>
      </footer>
    </div>
  );
}
export function Brand() {
  return (
    <div className="brand">
      <img
        className="brand-logo"
        src="/logo-gs-alexandre.jpg"
        alt="Groupe Scolaire Alexandre"
      />
      <span>
        Alexandre<span className="brand-light">BOT</span>
      </span>
    </div>
  );
}
