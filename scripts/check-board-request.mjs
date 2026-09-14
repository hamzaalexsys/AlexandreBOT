import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL || "http://localhost:5173";
const login = await fetch(`${base}/api/session`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ role: "student" }),
});
assert.equal(login.status, 200);
const cookie = login.headers.get("set-cookie")?.split(";")[0];
const blank = (lang) => ({
  id: "blank-entry",
  title: lang === "ar" ? "لوحتك جاهزة" : "Ton tableau est prêt",
  subtitle:
    lang === "ar"
      ? "اسأل ميلو أو ارسم شيئاً."
      : "Pose une question à Milo ou dessine quelque chose.",
  shapes: [],
  simulation: null,
});

const cases = [
  {
    label: "mathématiques",
    lang: "fr",
    message: "montre moi dans le tableau",
    history: [
      {
        role: "user",
        content: "pourrez tu mexpliquer les equations du premier degree",
      },
      {
        role: "assistant",
        content:
          "Une équation du premier degré ressemble à une balance. Par exemple x + 3 = 8 : on enlève 3 des deux côtés et on obtient x = 5.",
      },
    ],
    expected: /équation|equation|balance|x\s*[+=]/i,
  },
  {
    label: "français",
    lang: "fr",
    message: "Montre-moi trois exemples dans le tableau.",
    history: [
      {
        role: "user",
        content: "Explique-moi comment trouver le sujet et le verbe.",
      },
      {
        role: "assistant",
        content:
          "Le verbe raconte l’action. Pour trouver le sujet, demande qui est-ce qui fait cette action.",
      },
    ],
    expected: /sujet|verbe|phrase/i,
  },
  {
    label: "arabe",
    lang: "ar",
    message: "أرني ثلاثة أمثلة على اللوحة.",
    history: [
      {
        role: "user",
        content: "اشرح لي الجملة الاسمية بطريقة بسيطة.",
      },
      {
        role: "assistant",
        content: "الجملة الاسمية تبدأ باسم، وتتكوّن غالباً من مبتدأ وخبر.",
      },
    ],
    expected: /[\u0600-\u06ff]/,
  },
];

const selectedCases = process.env.TEST_SUBJECT
  ? cases.filter((test) => test.label === process.env.TEST_SUBJECT)
  : cases;
assert.ok(selectedCases.length, "unknown TEST_SUBJECT");

for (const test of selectedCases) {
  const started = Date.now();
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: test.message,
      lang: test.lang,
      age: 9,
      history: test.history,
      scene: blank(test.lang),
    }),
  });
  const reply = await response.json();
  assert.equal(response.status, 200, `${test.label}: ${JSON.stringify(reply)}`);
  assert.equal(reply.source, "openrouter");
  assert.ok(
    ["new", "update"].includes(reply.boardAction),
    `${test.label}: visual request must mutate the board`,
  );
  assert.ok(
    reply.scene?.shapes?.length >= 4 || reply.scene?.simulation,
    `${test.label}: the board must contain a visual lesson`,
  );
  assert.match(`${reply.scene.title} ${reply.message}`, test.expected);
  console.log(
    JSON.stringify({
      subject: test.label,
      pass: true,
      action: reply.boardAction,
      shapes: reply.scene.shapes.length,
      seconds: Math.round((Date.now() - started) / 1000),
      source: reply.source,
    }),
  );
}

console.log("PASS Milo: demandes visuelles mathématiques, français et arabe");
