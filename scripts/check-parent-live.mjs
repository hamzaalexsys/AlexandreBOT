import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL || "http://localhost:5173";
const login = await fetch(`${base}/api/session`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ role: "parent" }),
});
assert.equal(login.status, 200, "parent pilot session");
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);

const schoolResponse = await fetch(`${base}/api/child?lang=fr`, {
  headers: { cookie },
});
assert.equal(schoolResponse.status, 200, "complete school read");
const school = await schoolResponse.json();

const plain = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[–—]/g, "-")
    .toLowerCase();
const mentionsScore = (answer, value) => {
  const normalized = plain(answer).replaceAll(",", ".");
  return [Number(value).toFixed(2), Number(value).toFixed(1), String(value)].some(
    (candidate) => normalized.includes(candidate),
  );
};

assert.equal(plain(school.overview.child), "aamar");
assert.equal(school.overview.className, "CE 5 – C");
assert.equal(school.overview.schoolYear, "2026/2027");
assert.equal(school.attendance.items.length, 3);
assert.equal(school.attendance.items.filter((item) => item.justified).length, 1);
assert.equal(school.attendance.items.filter((item) => !item.justified).length, 2);
assert.equal(school.assiduity.items.length, 0);
assert.equal(school.homework.items.length, 0);
assert.equal(school.exams.items.length, 0);
assert.equal(school.latestMarks.items.length, 4);
assert.deepEqual(
  Object.fromEntries(
    school.latestMarks.items.map((item) => [plain(item.subject), item.rawScore]),
  ),
  { anglais: 8, arabe: 6.75, francais: 5, mathematiques: 7.5 },
);

const requiredReads = [
  "read_child_overview",
  "read_attendance",
  "read_assiduity",
  "read_homework",
  "read_exams",
  "read_latest_marks",
  "read_school_journey",
  "read_year_results",
  "read_subject_results",
  "read_term_results",
];
let passed = 0;
const from = Number(process.env.TEST_PARENT_FROM || 1);
const to = Number(process.env.TEST_PARENT_TO || 15);

async function ask(label, question, verify) {
  const index = Number.parseInt(label, 10);
  if (index < from || index > to) return;
  const started = Date.now();
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ message: question, lang: "fr", age: 9, history: [] }),
  });
  const reply = await response.json();
  assert.equal(response.status, 200, `${label}: ${JSON.stringify(reply)}`);
  assert.equal(reply.source, "openrouter", `${label}: real provider source`);
  assert.equal(reply.scene, null, `${label}: parent never draws a board`);
  assert.ok(reply.message.split(/\s+/).length <= 75, `${label}: concise answer`);
  for (const name of requiredReads)
    assert.ok(reply.toolNames.includes(name), `${label}: ${name}`);
  const evidence = `${reply.message}\n${JSON.stringify(reply.presentation)}`;
  try {
    verify(plain(evidence), evidence, reply);
  } catch (error) {
    console.error(JSON.stringify({ check: label, true: false, reply }));
    throw error;
  }
  console.log(
    JSON.stringify({
      check: label,
      true: true,
      seconds: Math.round((Date.now() - started) / 1000),
      component: reply.presentation?.kind || null,
    }),
  );
  passed++;
}

await ask("01 devoir demain", "Quels devoirs mon fils a-t-il pour demain ?", (answer, _, reply) => {
  assert.match(answer, /(aucun|pas de).{0,35}devoir/);
  assert.equal(reply.presentation?.kind, "empty");
});
await ask(
  "02 dernières notes",
  "Quelle est la dernière note de chaque matière de l’année dernière ?",
  (answer, original, reply) => {
    assert.equal(reply.presentation?.kind, "table");
    assert.ok(answer.includes("2025/2026"));
    for (const [subject, score] of Object.entries({ anglais: 8, arabe: 6.75, francais: 5, mathematiques: 7.5 })) {
      assert.ok(answer.includes(subject));
      assert.ok(mentionsScore(original, score));
    }
  },
);
await ask("03 absences", "Est-ce qu’il y a des absences ?", (answer, _, reply) => {
  assert.equal(reply.presentation?.kind, "timeline");
  assert.equal(reply.presentation.items.length, 3);
  assert.equal(reply.presentation.items.filter((item) => item.tone === "good").length, 1);
  assert.equal(reply.presentation.items.filter((item) => item.tone === "attention").length, 2);
  assert.ok(answer.includes("2026"));
});
await ask("04 assiduité", "L’assiduité", (answer, _, reply) => {
  assert.equal(reply.presentation?.kind, "empty");
  assert.match(answer, /(aucune|pas de).{0,35}assiduite/);
});
await ask("05 examens", "Quels sont ses prochains examens ?", (answer, _, reply) => {
  assert.equal(reply.presentation?.kind, "empty");
  assert.match(answer, /(aucun|pas d).{0,35}examen/);
});
await ask("06 parcours", "Présente-moi le parcours scolaire d’Aamar.", (answer) => {
  assert.ok(answer.includes("aamar"));
  assert.ok(answer.includes("2023/2024") && answer.includes("2024/2025"));
});
await ask("07 comparaison annuelle", "Compare ses résultats de 2023/2024 et 2024/2025.", (answer, original, reply) => {
  assert.equal(reply.presentation?.kind, "table");
  assert.ok(mentionsScore(original, 16.23));
  assert.ok(mentionsScore(original, 13.8));
  assert.match(answer, /(indicati|calcul|non officiel|pas.*officiel)/);
});
await ask("08 bilan global", "Comment va mon enfant globalement ?", (answer) => {
  assert.ok(answer.includes("aamar"));
  assert.ok(answer.includes("ce 5"));
  assert.ok(answer.includes("absence"));
});
await ask("09 progression", "Dans quelles matières a-t-il le plus progressé ?", (answer, original, reply) => {
  assert.equal(reply.presentation?.kind, "table");
  assert.ok(answer.includes("mathematique"));
  assert.ok(mentionsScore(original, 12.4));
  assert.ok(mentionsScore(original, 18.25));
});
await ask("10 semestres", "Comment ses résultats ont-ils évolué entre les semestres ?", (answer, original, reply) => {
  assert.equal(reply.presentation?.kind, "table");
  assert.ok(mentionsScore(original, 15.63));
  assert.ok(mentionsScore(original, 16.77));
  assert.ok(mentionsScore(original, 13.28));
  assert.ok(mentionsScore(original, 14.33));
});
await ask("11 français", "Le français demande-t-il une attention particulière au vu des notes ?", (answer, original, reply) => {
  assert.equal(reply.presentation?.kind, "table");
  assert.ok(answer.includes("francais"));
  assert.ok(mentionsScore(original, 16.93));
  assert.ok(mentionsScore(original, 13.45));
});
await ask("12 échantillons", "Quelles notes faut-il relativiser car elles sont peu nombreuses ?", (answer, _, reply) => {
  assert.equal(reply.presentation?.kind, "table");
  assert.match(answer, /(3|5).{0,20}note|note.{0,20}(3|5)/);
});
await ask("13 motif absence", "Le motif exact des absences est-il renseigné ?", (answer, _, reply) => {
  assert.equal(reply.presentation?.kind, "timeline");
  assert.match(answer, /(motif.{0,30}(non|pas)|aucun motif|non renseigne|motif n.est renseigne)/);
});
await ask("14 questions enseignant", "Donne-moi trois questions à poser au professeur de français.", (answer) => {
  assert.match(answer, /1[.)]/);
  assert.match(answer, /2[.)]/);
  assert.match(answer, /3[.)]/);
});
await ask("15 actions maison", "Donne-moi trois actions simples à la maison fondées sur ses résultats.", (answer) => {
  assert.match(answer, /1[.)]/);
  assert.match(answer, /2[.)]/);
  assert.match(answer, /3[.)]/);
  assert.match(answer, /(lecture|lire|exercice|routine|entrain|jeu)/);
});

console.log(`PASS Alexandre: ${passed}/${to - from + 1} réponses OpenRouter concordent avec les cinq vues Azure SQL en lecture seule`);
