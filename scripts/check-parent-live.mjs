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

const response = await fetch(`${base}/api/child?lang=fr`, { headers: { cookie } });
assert.equal(response.status, 200, "current school-year read");
const school = await response.json();
const currentSchoolYear = school.overview.schoolYear;
assert.match(currentSchoolYear, /^20\d{2}\/20\d{2}$/);

for (const [section, value] of Object.entries(school)) {
  if (!value || typeof value !== "object" || !Array.isArray(value.items)) continue;
  for (const item of value.items)
    if (item.schoolYear != null)
      assert.equal(item.schoolYear, currentSchoolYear, `${section} must contain only the active school year`);
}
assert.ok((school.yearResults.coveredYears ?? []).every((year) => year === currentSchoolYear));

const pastQuestion = "Peux-tu me donner les notes de 2025/2026 ?";
const chat = await fetch(`${base}/api/chat`, {
  method: "POST",
  headers: { cookie, "Content-Type": "application/json" },
  body: JSON.stringify({ message: pastQuestion, lang: "fr", age: 9, history: [] }),
});
const reply = await chat.json();
assert.equal(chat.status, 200, JSON.stringify(reply));
assert.equal(reply.source, "openrouter");
const evidence = `${reply.message}\n${JSON.stringify(reply.presentation)}`;
assert.match(evidence, new RegExp(currentSchoolYear.replace("/", "\\/")));
assert.match(reply.message, /(ne peux pas|pas accès|indisponible|uniquement|seules)/i);
assert.doesNotMatch(evidence.replace(/\b20\d{2}\/20\d{2}\b/g, ""), /\b\d+(?:[.,]\d+)?\b/);
assert.equal(reply.presentation?.kind, "empty");
console.log(`PASS current school-year scope: ${currentSchoolYear}; prior-year marks are unavailable`);
