import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
async function session(role) {
  const r = await fetch(`${base}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  assert.equal(r.status, 200, `session ${role}`);
  return r.headers.get("set-cookie").split(";")[0];
}
const anonymous = await fetch(`${base}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
assert.equal(anonymous.status, 401);
const student = await session("student");
assert.equal(
  (await fetch(`${base}/api/child`, { headers: { cookie: student } })).status,
  403,
);
const denied = await fetch(`${base}/api/chat`, {
  method: "POST",
  headers: {
    cookie: student,
    "Content-Type": "application/json",
    Origin: "https://example.invalid",
  },
  body: "{}",
});
assert.equal(denied.status, 403);
console.log("PASS session, anonymous access, role isolation, origin checks");
async function chat(cookie, message, lang = "fr", scene) {
  const start = Date.now();
  const r = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      lang,
      age: 9,
      history: [],
      ...(scene ? { scene } : {}),
    }),
  });
  const data = await r.json();
  if (r.status !== 200)
    throw new Error(`Chat failed ${r.status}: ${JSON.stringify(data)}`);
  assert.equal(data.source, "openrouter");
  assert.ok(data.message.length > 10);
  console.log(
    JSON.stringify({
      message,
      seconds: Math.round((Date.now() - start) / 1000),
      action: data.boardAction,
      tools: data.toolNames,
      shapes: data.scene?.shapes.length,
      simulation: data.scene?.simulation?.type,
      reply: data.message.slice(0, 220),
    }),
  );
  return data;
}
if (!process.env.TEST_REMAINING) {
  const greeting = await chat(student, "Bonjour Milo !");
  assert.equal(greeting.boardAction, "keep");
  assert.equal(greeting.scene, null);
  assert.equal(greeting.toolNames.length, 0);
}
const simulated = process.env.TEST_REMAINING
  ? {
      scene: {
        id: "test-bounce",
        title: "Le ballon",
        subtitle: "Observe sa trajectoire.",
        shapes: [],
        simulation: {
          type: "bounce",
          height: 3,
          gravity: 9.81,
          elasticity: 0.75,
        },
      },
    }
  : await chat(
      student,
      "Montre-moi avec une expérience interactive comment un ballon rebondit et sa trajectoire. Je veux changer sa hauteur.",
    );
assert.equal(simulated.scene?.simulation?.type, "bounce");
if (!process.env.TEST_REMAINING) {
  const update = await chat(
    student,
    "Garde notre tableau et règle la hauteur du même ballon à 5 mètres.",
    "fr",
    simulated.scene,
  );
  assert.equal(update.boardAction, "update");
  assert.equal(update.scene?.simulation?.height, 5);
}
const flower = await chat(
  student,
  "Dessine une plante qui pousse avec un soleil animé. Je veux pouvoir toucher la plante pour comprendre ce dont elle a besoin.",
);
assert.ok(flower.scene?.shapes.length > 1);
assert.ok(flower.scene.shapes.some((s) => s.animation));
const parent = await session("parent");
assert.equal(
  (await fetch(`${base}/api/child`, { headers: { cookie: parent } })).status,
  200,
);
const summary = await chat(parent, "Comment va mon enfant ?");
assert.equal(summary.scene, null);
assert.ok(summary.toolNames.includes("read_learning"));
await chat(
  student,
  "اشرح لي لماذا تنزل الكرة بكلمات بسيطة دون تغيير اللوحة.",
  "ar",
  simulated.scene,
);
console.log(
  "PASS requested real OpenRouter checks: animated drawing, parent overview, Arabic; optional simulation and continuity",
);
