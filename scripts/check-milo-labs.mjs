import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL || "http://localhost:5173";

async function session() {
  const response = await fetch(`${base}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "student" }),
  });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}

async function ask(cookie, message, lang = "fr") {
  const started = Date.now();
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ message, lang, age: 9, history: [] }),
  });
  const reply = await response.json();
  if (response.status !== 200)
    throw new Error(`${message}: HTTP ${response.status} ${JSON.stringify(reply)}`);
  console.log(
    JSON.stringify({
      seconds: Math.round((Date.now() - started) / 1000),
      message,
      toolNames: reply.toolNames,
      action: reply.boardAction,
      type: reply.scene?.simulation?.type,
      shapes: reply.scene?.shapes?.length,
      answer: reply.message.slice(0, 150),
    }),
  );
  return reply;
}

const cookie = await session();
const cases = [
  {
    message: "Crée un laboratoire interactif où je peux mélanger les lumières rouge, verte et bleue.",
    type: "color",
  },
  {
    message: "Construis un polygone dans un laboratoire de géométrie interactif où je peux changer ses côtés.",
    type: "geometry",
  },
  {
    message: "Montre-moi une addition avec des bonds sur une droite numérique interactive.",
    type: "numberline",
  },
];

for (const item of cases) {
  const reply = await ask(cookie, item.message);
  assert.deepEqual(reply.toolNames, ["create_interactive_concept_lab"]);
  assert.equal(reply.scene?.simulation?.type, item.type);
  assert.equal(reply.boardAction, "new");
}

const equation = await ask(cookie, "Résous 2x + 4 = 10 avec une explication sur le tableau.");
assert.deepEqual(equation.toolNames, ["solve_linear_equation"]);
assert.ok(equation.scene?.shapes?.length >= 4);
assert.ok(equation.scene.shapes.some((shape) => /x = 3/.test(shape.text || "")));
assert.equal(equation.boardAction, "new");

const arabic = await ask(cookie, "أنشئ مختبرا تفاعليا لمزج الألوان والضوء", "ar");
assert.deepEqual(arabic.toolNames, ["create_interactive_concept_lab"]);
assert.equal(arabic.scene?.simulation?.type, "color");

const ordinary = await ask(cookie, "Pourquoi le ciel paraît-il bleu ?");
assert.equal(ordinary.toolNames.length, 0);

console.log("PASS Milo selective tools: 3 live labs, checked equation, Arabic and no-tool ordinary reply");
