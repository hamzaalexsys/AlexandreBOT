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
  return [value.toFixed(2), value.toFixed(1)].some((candidate) =>
    normalized.includes(candidate),
  );
};

assert.equal(plain(school.overview.child), "aamar");
assert.equal(school.overview.className, "CE 5 – C");
assert.equal(school.overview.schoolYear, "2026/2027");
assert.ok(school.journey.items.some((item) => item.schoolYear === "2023/2024"));
assert.ok(school.journey.items.some((item) => item.schoolYear === "2024/2025"));
const year2023 = school.yearResults.items.find(
  (item) => item.schoolYear === "2023/2024",
);
const year2024 = school.yearResults.items.find(
  (item) => item.schoolYear === "2024/2025",
);
assert.equal(year2023.noteCount, 49);
assert.equal(year2023.average20, 16.23);
assert.equal(year2024.noteCount, 50);
assert.equal(year2024.average20, 13.8);
assert.equal(year2023.discardedCount + year2024.discardedCount, 0);
assert.equal(school.attendance.items.length, 1);
assert.equal(school.attendance.items[0].subject, "FRANCAIS");
assert.equal(school.attendance.items[0].justified, false);

const requiredReads = [
  "read_child_overview",
  "read_school_journey",
  "read_year_results",
  "read_subject_results",
  "read_term_results",
  "read_attendance",
];
const startAt = Number(process.env.TEST_PARENT_FROM || 1);
let passed = 0;

async function ask(label, question, verify) {
  if (Number.parseInt(label, 10) < startAt) return;
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
  for (const name of requiredReads)
    assert.ok(reply.toolNames.includes(name), `${label}: ${name}`);
  assert.doesNotMatch(
    plain(reply.message),
    /(?:(aucun|pas de|non.{0,20}enregistr).{0,25}(resultat|note|moyenne).{0,100}(2025\/2026|2026\/2027)|(2025\/2026|2026\/2027).{0,100}(aucun|pas de|non.{0,20}enregistr).{0,25}(resultat|note|moyenne))/,
    `${label}: no conclusion outside result-query coverage`,
  );
  try {
    verify(plain(reply.message), reply.message);
  } catch (error) {
    console.error(
      JSON.stringify({ check: label, true: false, answer: reply.message }),
    );
    throw error;
  }
  console.log(
    JSON.stringify({
      check: label,
      true: true,
      seconds: Math.round((Date.now() - started) / 1000),
      source: reply.source,
    }),
  );
  passed++;
}

await ask(
  "1 parcours scolaire",
  "Alexandre, présente-moi le parcours scolaire d’Aamar.",
  (answer) => {
    assert.ok(answer.includes("aamar"));
    assert.ok(answer.includes("2023/2024") && answer.includes("2024/2025"));
    assert.ok(answer.includes("ce 2") && answer.includes("ce 3"));
  },
);
await ask(
  "2 comparaison annuelle",
  "Compare ses résultats de 2023/2024 et 2024/2025.",
  (answer, original) => {
    assert.ok(mentionsScore(original, 16.23));
    assert.ok(mentionsScore(original, 13.8));
    assert.match(answer, /(indicati|calcul|non officiel|pas.*officiel)/);
  },
);
await ask(
  "3 bilan global",
  "Comment va mon enfant globalement ?",
  (answer) => {
    assert.ok(answer.includes("aamar"));
    assert.ok(answer.includes("ce 5") || answer.includes("2026/2027"));
    assert.ok(answer.includes("absence"));
  },
);
await ask(
  "4 forces",
  "Quelles sont ses principales forces ?",
  (answer) => {
    assert.match(answer, /(mathematique|francais|arabe|anglais)/);
    assert.doesNotMatch(answer, /(diagnostic|trouble emotionnel)/);
  },
);
await ask(
  "5 progression par matière",
  "Dans quelles matières a-t-il le plus progressé ?",
  (answer) => {
    assert.ok(answer.includes("mathematique"));
    assert.ok(answer.includes("12") && answer.includes("18"));
  },
);
await ask(
  "6 baisse et nuance",
  "Pourquoi sa moyenne générale a-t-elle baissé malgré sa progression en mathématiques ?",
  (answer) => {
    assert.ok(answer.includes("mathematique"));
    assert.match(answer, /(francais|arabe|anglais)/);
    assert.match(answer, /(ne permet pas|ne suffit pas|cause|expliquer avec certitude)/);
  },
);
await ask(
  "7 semestres",
  "Comment ses résultats ont-ils évolué entre le premier et le deuxième semestre ?",
  (answer, original) => {
    assert.match(answer, /(semestre|trimestre|periode)/);
    assert.ok(
      mentionsScore(original, 15.63) || mentionsScore(original, 13.28),
    );
    assert.ok(
      mentionsScore(original, 16.77) || mentionsScore(original, 14.33),
    );
  },
);
await ask(
  "8 français",
  "Le français demande-t-il une attention particulière ?",
  (answer, original) => {
    assert.ok(answer.includes("francais"));
    assert.ok(mentionsScore(original, 16.93));
    assert.ok(mentionsScore(original, 13.45));
  },
);
await ask(
  "9 taille des échantillons",
  "Quels résultats dois-je relativiser parce qu’il y a peu de notes ?",
  (answer) => {
    assert.ok(answer.includes("note"));
    assert.match(answer, /(mathematique|anglais)/);
    assert.match(answer, /\b(3|5)\b/);
  },
);
await ask(
  "10 absence actuelle",
  "Aamar a-t-il une absence cette année ? Est-elle justifiée ?",
  (answer) => {
    assert.ok(answer.includes("absence"));
    assert.ok(answer.includes("francais"));
    assert.match(answer, /(14 septembre|2026-09-14|14\/09\/2026)/);
    assert.match(
      answer,
      /((non|pas)[\s-]*justifie|injustifie|justified\s*=\s*false)/,
    );
  },
);
await ask(
  "11 motif manquant",
  "Est-ce que la base indique le motif exact de son absence ?",
  (answer) => {
    assert.match(answer, /(aucun motif|motif.*pas|motif.*non|ne.*indique|n'est pas renseigne)/);
  },
);
await ask(
  "12 résumé rendez-vous",
  "Prépare-moi un résumé naturel pour mon prochain échange avec son enseignant.",
  (answer) => {
    assert.ok(answer.includes("aamar"));
    assert.match(answer, /(mathematique|francais)/);
    assert.ok(answer.includes("absence"));
  },
);
await ask(
  "13 questions enseignant",
  "Quelles questions devrais-je poser à son professeur de français ?",
  (answer) => {
    assert.ok(answer.includes("francais"));
    assert.match(answer, /(question|demander|pourriez|comment)/);
  },
);
await ask(
  "14 actions maison",
  "Donne-moi trois actions simples pour l’accompagner à la maison, fondées uniquement sur ses résultats.",
  (answer) => {
    assert.match(answer, /(maison|lecture|exercice|routine|entrain)/);
    assert.match(answer, /(francais|mathematique|arabe|anglais)/);
  },
);
await ask(
  "15 données manquantes",
  "Quelles informations manquent encore pour comprendre complètement sa situation ?",
  (answer) => {
    assert.match(answer, /(manque|aucun|aucune|pas de|non renseigne)/);
    assert.match(answer, /(observation|message|devoir|motif)/);
  },
);

console.log(
  `PASS Alexandre: ${passed} réponses OpenRouter vérifiées à partir du scénario ${startAt} concordent avec le dossier Azure SQL d’Aamar`,
);
