import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL || "http://localhost:5173";
const question = "Pour chaque devoir, tu me dis les dates de retour et aussi ce qu'il doit faire.";
const login = await fetch(`${base}/api/session`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ role: "parent" }),
});
assert.equal(login.status, 200);
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);

const childResponse = await fetch(`${base}/api/child`, { headers: { cookie } });
assert.equal(childResponse.status, 200);
const child = await childResponse.json();
const homework = child.homework.items;
assert.ok(homework.length > 1, "the pilot must contain several documents to test completeness");

const response = await fetch(`${base}/api/chat`, {
  method: "POST",
  headers: { cookie, "Content-Type": "application/json" },
  body: JSON.stringify({ message: question, lang: "fr", age: 9, history: [] }),
  signal: AbortSignal.timeout(90_000),
});
if (!response.ok) throw new Error(`parent chat ${response.status}: ${await response.text()}`);
const reply = await response.json();
assert.equal(reply.presentation?.kind, "tasks");
assert.equal(reply.presentation.items.length, homework.length);
assert.doesNotMatch(reply.message, /en dessous|ci-dessous|dans le tableau|dans la liste/i);
assert.doesNotMatch(reply.message, /[\u0600-\u06ff]/u, "French spoken answer must translate Arabic source instructions");
assert.doesNotMatch(reply.message, /bon week-end|bon courage/i, "remove non-actionable greetings from homework instructions");
for (let index = 1; index <= homework.length; index++)
  assert.match(reply.message, new RegExp(`(?:^|\\s)${index}[.)]\\s`), `missing spoken homework item ${index}`);

const spokenAt = performance.now();
const audio = await fetch(`${base}/api/speech`, {
  method: "POST",
  headers: { cookie, "Content-Type": "application/json" },
  body: JSON.stringify({ text: reply.message, lang: "fr" }),
  signal: AbortSignal.timeout(35_000),
});
assert.equal(audio.status, 200);
const reader = audio.body.getReader();
const first = await reader.read();
assert.ok(first.value?.length);
await reader.cancel();
console.log(JSON.stringify({ homeworkCount: homework.length, spokenCharacters: reply.message.length, firstAudioMs: Math.round(performance.now() - spokenAt), message: reply.message }));
console.log("PASS every homework item is spoken with no reference to a missing visual panel");
