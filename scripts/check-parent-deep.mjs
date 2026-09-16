import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const base = process.env.TEST_BASE_URL || "http://localhost:5173";
const parseEnv = (file) =>
  Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );
const appEnv = parseEnv(new URL("../.env", import.meta.url));
const gwEnv = parseEnv(
  new URL("../services/school-gateway/.env", import.meta.url),
);
const enrollmentId = Number(appEnv.PILOT_ENROLLMENT_ID || 0);
const gwToken = gwEnv.GATEWAY_SERVICE_TOKEN || "";
const gwBase = `http://127.0.0.1:${Number(gwEnv.PORT || 8788)}`;

async function gateway(resource) {
  const response = await fetch(`${gwBase}/v1/${resource}?enrollmentId=${enrollmentId}`, {
    headers: { Authorization: `Bearer ${gwToken}`, "X-Verified-Subject": "pilot-parent" },
  });
  assert.equal(response.status, 200, `gateway ${resource}`);
  const data = await response.json();
  return data.items || [];
}

const login = await fetch(`${base}/api/session`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ role: "parent" }),
});
assert.equal(login.status, 200, "parent pilot session");
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);

const schoolResponse = await fetch(`${base}/api/child?lang=fr`, { headers: { cookie } });
assert.equal(schoolResponse.status, 200);
const school = await schoolResponse.json();

const plain = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[–—]/g, "-")
    .toLowerCase();
const mentionsScore = (text, value) => {
  const normalized = plain(text).replaceAll(",", ".");
  return [Number(value).toFixed(2), Number(value).toFixed(1), String(value)].some(
    (candidate) => normalized.includes(candidate),
  );
};

const markDetails = await gateway("markDetails");
const competencies = await gateway("competencies");
const teachers = await gateway("teachers");
const activities = await gateway("activities");
assert.equal(plain(school.overview.child), "aamar");
assert.equal(school.latestMarks.items.length, 4);

const mathsDetails2425 = markDetails.filter(
  (item) => item.schoolYear === "2024/2025" && plain(item.subject).includes("math"),
);
const mathsCompetencies = competencies.filter((item) =>
  plain(item.subject).includes("math"),
);
const weakestMaths = [...mathsCompetencies]
  .sort((a, b) => Number(a.score) - Number(b.score))[0];
const strongestMaths = [...mathsCompetencies]
  .sort((a, b) => Number(b.score) - Number(a.score))[0];
const mathsTeacher = teachers.find((item) => plain(item.subject).includes("math"));
const frenchTeacher = teachers.find((item) => plain(item.subject).includes("franc"));

const requiredReads = [
  "read_child_overview",
  "read_attendance",
  "read_assiduity",
  "read_homework",
  "read_exams",
  "read_latest_marks",
  "read_mark_details",
  "read_competency_scores",
  "read_class_teachers",
  "read_student_activities",
  "read_school_journey",
  "read_year_results",
  "read_subject_results",
  "read_term_results",
];

let passed = 0;
const results = [];
const from = Number(process.env.TEST_DEEP_FROM || 1);
const to = Number(process.env.TEST_DEEP_TO || 20);

async function ask(label, question, history, verify) {
  const index = Number.parseInt(label, 10);
  if (index < from || index > to) return [];
  const started = Date.now();
  let reply;
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 35_000));
    response = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ message: question, lang: "fr", age: 9, history }),
    });
    reply = await response.json();
    const transient =
      response.status === 429 ||
      (response.status === 503 && reply?.error === "AI_UNAVAILABLE");
    if (!transient) break;
    console.log(
      `${response.status} on ${label}, retrying in 35s (attempt ${attempt + 1})`,
    );
  }
  const evidence = `${reply.message || ""}\n${JSON.stringify(reply.presentation || null)}`;
  const problems = [];
  try {
    assert.equal(response.status, 200, JSON.stringify(reply));
    assert.equal(reply.source, "openrouter", "real provider source");
    assert.equal(reply.scene, null, "parent never draws a board");
    assert.ok(
      (reply.message || "").split(/\s+/).length <= 90,
      "answer stays concise",
    );
    for (const name of requiredReads)
      assert.ok(reply.toolNames.includes(name), `tool ${name}`);
    verify(evidence, reply, (issue) => problems.push(issue));
    if (problems.length) throw new Error(problems.join(" | "));
    passed++;
    results.push({
      check: label,
      ok: true,
      seconds: Math.round((Date.now() - started) / 1000),
      component: reply.presentation?.kind || null,
      source: reply.presentation?.sourceHint || null,
      message: reply.message,
      presentation: reply.presentation,
    });
    console.log(`PASS ${label} (${Math.round((Date.now() - started) / 1000)}s)`);
    await new Promise((r) => setTimeout(r, 6_000));
    return [
      { role: "user", content: question },
      { role: "assistant", content: reply.message },
    ];
  } catch (error) {
    results.push({
      check: label,
      ok: false,
      error: String(error.message || error).slice(0, 400),
      message: reply.message,
      presentation: reply.presentation,
      problems,
    });
    console.log(`FAIL ${label}: ${String(error.message || error).slice(0, 300)}`);
    return [
      { role: "user", content: question },
      { role: "assistant", content: reply.message || "" },
    ];
  }
}

let history = [];
history = await ask(
  "01 devoirs + relance demain",
  "Quels devoirs mon fils a-t-il pour demain ?",
  [],
  (evidence, _reply, fail) => {
    if (!/(aucun|pas de).{0,40}devoir/.test(plain(evidence)))
      fail("should say no homework published");
    if (!/(demain|tomorrow)/.test(plain(evidence))) fail("should address 'demain'");
  },
);
history = await ask(
  "02 relance: tous les devoirs alors",
  "Et sur l’ensemble de la semaine alors ?",
  history,
  (evidence, _reply, fail) => {
    if (!/(aucun|pas de).{0,40}devoir/.test(plain(evidence)))
      fail("should still say no homework published");
  },
);

history = await ask(
  "03 dernière note par matière",
  "Quelle est la dernière note de chaque matière de l’année dernière ?",
  [],
  (evidence, reply, fail) => {
    if (reply.presentation?.kind !== "table") fail("table expected");
    if (!evidence.includes("2025/2026")) fail("should mention 2025/2026");
    for (const [subject, score] of Object.entries({
      anglais: 8,
      arabe: 6.75,
      francais: 5,
      mathematiques: 7.5,
    })) {
      if (!plain(evidence).includes(subject)) fail(`subject ${subject}`);
      if (!mentionsScore(evidence, score)) fail(`score ${subject}=${score}`);
    }
  },
);
history = await ask(
  "04 relance: note arabe précise",
  "Et en arabe, c’était quelle évaluation exactement ?",
  history,
  (evidence, _reply, fail) => {
    if (!plain(evidence).includes("arabe")) fail("should mention arabe");
    if (!mentionsScore(evidence, 6.75)) fail("arabe score 6.75 expected");
  },
);

const mathsExpectations = mathsDetails2425.map((item) => ({
  date: String(item.examDate).slice(0, 10),
  raw: Number(item.rawScore),
  scale: Number(item.scale),
}));
history = await ask(
  "05 notes en détail maths 2024/2025",
  "Montre-moi les notes en détail en mathématiques pour 2024/2025, chaque note et combien il a eu, pas la moyenne.",
  [],
  (evidence, reply, fail) => {
    if (reply.presentation?.kind !== "table") fail("table expected");
    const rows = reply.presentation?.rows || [];
    if (rows.length !== mathsExpectations.length)
      fail(`expected ${mathsExpectations.length} rows, got ${rows.length}`);
    for (const item of mathsExpectations) {
      if (!mentionsScore(evidence, item.raw)) fail(`raw mark ${item.raw}`);
      if (!evidence.includes(item.date.slice(0, 4)) && !evidence.includes(item.date))
        fail(`year of exam ${item.date}`);
    }
  },
);
history = await ask(
  "06 relance: moyenne vs détail",
  "Donc si je calcule la moyenne de ces trois notes, ça fait combien ?",
  history,
  (evidence, _reply, fail) => {
    const values = mathsExpectations.map((item) => item.raw);
    const rawAverage = values.reduce((a, b) => a + b, 0) / values.length;
    const rawAverage20 =
      mathsExpectations.reduce((acc, item) => acc + (item.raw / item.scale) * 20, 0) /
      mathsExpectations.length;
    if (
      !mentionsScore(evidence, Math.round(rawAverage * 100) / 100) &&
      !mentionsScore(evidence, Math.round(rawAverage20 * 100) / 100)
    )
      fail(`computed average ${rawAverage}/10 or ${rawAverage20}/20 expected`);
  },
);

history = await ask(
  "07 évolution toutes matières",
  "Peux-tu me dire l’évolution des notes de mon enfant sur toutes les matières au cours des dernières années ?",
  [],
  (evidence, reply, fail) => {
    if (!mentionsScore(evidence, 16.23)) fail("2023/2024 average 16.23");
    if (!mentionsScore(evidence, 13.8)) fail("2024/2025 average 13.8");
    if (!evidence.includes("2023/2024") || !evidence.includes("2024/2025"))
      fail("both school years expected");
    if (!/(indicati|calcul|officiel)/.test(plain(evidence)))
      fail("should flag indicative averages");
  },
);
history = await ask(
  "08 relance: seulement maths",
  "Parfait, maintenant montre-moi seulement les mathématiques.",
  history,
  (evidence, reply, fail) => {
    const rows = reply.presentation?.rows || [];
    if (!rows.length || rows.length > 2) fail("maths-only rows expected (≤2)");
    if (!mentionsScore(evidence, 12.4)) fail("maths 2023/2024 12.4");
    if (!mentionsScore(evidence, 18.25)) fail("maths 2024/2025 18.25");
    if (plain(JSON.stringify(rows)).includes("francais"))
      fail("other subjects must not appear");
  },
);

history = await ask(
  "09 comparaison annuelle",
  "Compare ses résultats de 2023/2024 et 2024/2025.",
  [],
  (evidence, _reply, fail) => {
    if (!mentionsScore(evidence, 16.23)) fail("16.23");
    if (!mentionsScore(evidence, 13.8)) fail("13.8");
  },
);

history = await ask(
  "10 progression",
  "Dans quelles matières a-t-il le plus progressé ?",
  [],
  (evidence, _reply, fail) => {
    if (!plain(evidence).includes("math")) fail("maths should stand out");
    if (!mentionsScore(evidence, 12.4) || !mentionsScore(evidence, 18.25))
      fail("maths progression 12.4→18.25");
  },
);

history = await ask(
  "11 semestres",
  "Comment ses résultats ont-ils évolué entre les semestres ?",
  [],
  (evidence, _reply, fail) => {
    for (const value of [15.63, 16.77, 13.28, 14.33])
      if (!mentionsScore(evidence, value)) fail(`term average ${value}`);
  },
);

const weakestRaw = weakestMaths ? `${weakestMaths.competency}` : "";
history = await ask(
  "12 compétences faibles en maths",
  "D’après les évaluations, quelles compétences il maîtrise le moins en mathématiques ?",
  [],
  (evidence, reply, fail) => {
    if (reply.presentation?.kind !== "table") fail("competency table expected");
    if (!/(compétence|competence|كفاء)/.test(plain(evidence)))
      fail("should speak about competencies");
    if (!mentionsScore(evidence, Number(weakestMaths?.score ?? 0)))
      fail(`weakest score ${weakestMaths?.score} expected`);
    if (!plain(evidence).includes(plain(weakestRaw).slice(0, 12)))
      fail("weakest competency label expected");
  },
);
history = await ask(
  "13 relance: points forts maths",
  "Et ses points forts en mathématiques alors ?",
  history,
  (evidence, _reply, fail) => {
    const strongestLabel = plain(String(strongestMaths?.competency || "")).slice(0, 12);
    const hasLabel =
      strongestLabel && plain(evidence).includes(strongestLabel);
    const hasGroundedAlternative =
      plain(evidence).includes("math") &&
      (mentionsScore(evidence, 18.25) ||
        mentionsScore(evidence, Number(strongestMaths?.score ?? 3)));
    if (!hasLabel && !hasGroundedAlternative)
      fail("strongest competency label or grounded maths strength expected");
  },
);

history = await ask(
  "14 prof de maths",
  "Qui est le professeur de mathématiques de sa classe ?",
  [],
  (evidence, _reply, fail) => {
    if (!plain(evidence).includes(plain(String(mathsTeacher?.lastName || ""))))
      fail(`maths teacher ${mathsTeacher?.lastName} expected`);
    if (!plain(evidence).includes(plain(String(mathsTeacher?.firstName || ""))))
      fail(`maths teacher ${mathsTeacher?.firstName} expected`);
  },
);
history = await ask(
  "15 relance: prof de français",
  "Et celui de français ?",
  history,
  (evidence, _reply, fail) => {
    if (!plain(evidence).includes(plain(String(frenchTeacher?.lastName || ""))))
      fail(`french teacher ${frenchTeacher?.lastName} expected`);
  },
);

history = await ask(
  "16 activités parascolaires",
  "À quelles activités parascolaires mon enfant est-il inscrit ?",
  [],
  (evidence, _reply, fail) => {
    for (const activity of activities) {
      if (!plain(evidence).includes(plain(String(activity.activity)).slice(0, 10)))
        fail(`activity ${activity.activity} expected`);
    }
    if (!plain(evidence).includes("excursion")) fail("activity type expected");
  },
);

history = await ask(
  "17 absences",
  "Est-ce qu’il a été absent ?",
  [],
  (evidence, _reply, fail) => {
    const total = school.attendance.items.length;
    const justified = school.attendance.items.filter((item) => item.justified).length;
    const unjustified = total - justified;
    if (!mentionsScore(evidence, total) && !/(une|un|deux|trois|quatre)/.test(plain(evidence)))
      fail(`${total} absences expected`);
    for (const item of school.attendance.items) {
      const day = String(item.dateFrom || "").slice(0, 10);
      const dayMonth = day.slice(5).replace("-", "/");
      const dayNumber = String(Number(day.slice(8, 10)));
      if (
        !evidence.includes(day) &&
        !plain(evidence).includes(dayMonth) &&
        !new RegExp(`\\b${dayNumber}\\b`).test(plain(evidence))
      )
        fail(`absence date ${day} expected`);
    }
    if (justified && !/(justifi).{0,60}(1|une|un)|1.{0,30}justifi|une.{0,20}justifi/.test(plain(evidence)))
      fail(`${justified} justified expected`);
    if (unjustified && !/(non justifi).{0,80}(2|deux|3|trois|4|quatre)|(2|deux|3|trois|4|quatre).{0,60}non justifi/.test(plain(evidence)))
      fail(`${unjustified} unjustified expected`);
  },
);
await ask(
  "18 relance: motif justifié",
  "Quel est le motif de l’absence justifiée ?",
  history,
  (evidence, _reply, fail) => {
    if (!/(motif).{0,40}(non|pas)|aucun motif|non renseign/.test(plain(evidence)))
      fail("should say reason not recorded");
  },
);

await ask(
  "19 assiduité",
  "Et son assiduité, rien à signaler ?",
  [],
  (evidence, _reply, fail) => {
    if (!/(aucun|aucune|pas de).{0,40}(observation|enregistrement).{0,40}assiduite|assiduite.{0,40}(aucun|aucune|rien a signaler)/.test(plain(evidence)))
      fail("should say no assiduity observation recorded");
  },
);

await ask(
  "20 parcours",
  "Présente-moi le parcours scolaire de mon enfant.",
  [],
  (evidence, reply, fail) => {
    if (reply.presentation?.kind !== "timeline") fail("journey timeline expected");
    if (!evidence.includes("2023/2024") || !evidence.includes("2024/2025"))
      fail("school years expected");
    if (!/(ce 2|ce2).{0,10}\bb\b/.test(plain(evidence))) fail("CE 2 – B expected");
    if (!/(ce 3|ce3).{0,10}\bb\b/.test(plain(evidence))) fail("CE 3 – B expected");
    if (!/(ce 4|ce4).{0,10}\bc\b/.test(plain(evidence))) fail("CE 4 – C expected");
  },
);

console.log("\n=== RÉSULTATS DÉTAILLÉS ===");
for (const result of results) {
  console.log(
    `\n[${result.ok ? "OK" : "KO"}] ${result.check}${result.component ? ` → ${result.component}` : ""}`,
  );
  console.log(`  Réponse: ${(result.message || "").slice(0, 220)}`);
  if (result.presentation)
    console.log(
      `  Composant: ${JSON.stringify(result.presentation).slice(0, 220)}`,
    );
  if (!result.ok) console.log(`  Problèmes: ${result.error}`);
}
console.log(`\nDEEP PASS ${passed}/${to - from + 1}`);
if (passed < to - from + 1) process.exit(1);
