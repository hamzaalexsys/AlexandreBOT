import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const base = process.env.TEST_BASE_URL || "http://localhost:5173";
const parseEnv = (path) =>
  Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const split = line.indexOf("=");
        return [line.slice(0, split).trim(), line.slice(split + 1).trim()];
      }),
  );
const appEnv = parseEnv(new URL("../.env", import.meta.url));
const gatewayEnv = parseEnv(new URL("../services/school-gateway/.env", import.meta.url));
const enrollmentId = Number(appEnv.PILOT_ENROLLMENT_ID);
const token = gatewayEnv.GATEWAY_SERVICE_TOKEN;
assert.ok(Number.isSafeInteger(enrollmentId) && enrollmentId > 0);
assert.ok(token?.length >= 48);

const login = await fetch(`${base}/api/session`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ role: "parent" }),
});
assert.equal(login.status, 200);
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);
const overviewResponse = await fetch(`${base}/api/child?lang=fr`, { headers: { cookie } });
assert.equal(overviewResponse.status, 200);
const schoolYear = (await overviewResponse.json()).overview.schoolYear;
assert.match(schoolYear, /^20\d{2}\/20\d{2}$/);

const endpoint = `http://127.0.0.1:${Number(gatewayEnv.PORT || 8788)}`;
const headers = { Authorization: `Bearer ${token}`, "X-Verified-Subject": "pilot-parent" };
async function gateway(resource, selectedEnrollment = enrollmentId) {
  const response = await fetch(`${endpoint}/v1/${resource}?enrollmentId=${selectedEnrollment}`, { headers });
  const result = await response.json();
  assert.equal(response.status, 200, `${resource}: ${JSON.stringify(result)}`);
  assert.equal(result.source, "school");
  assert.ok(Array.isArray(result.items));
  return result.items;
}

const resources = [
  "learning", "attendance", "assiduity", "messages", "homework", "exams",
  "latestMarks", "markDetails", "competencies", "teachers", "activities",
  "journey", "yearResults", "subjectResults", "termResults",
];
for (const resource of resources) {
  const items = await gateway(resource);
  for (const item of items)
    if (item.schoolYear != null)
      assert.equal(item.schoolYear, schoolYear, `${resource} returned another school year`);
}
for (const resource of ["latestMarks", "markDetails", "competencies", "journey", "yearResults", "subjectResults", "termResults"])
  assert.equal((await gateway(resource, enrollmentId + 999_999)).length, 0, `${resource} escaped the active enrollment`);

console.log(`PASS school gateway: ${resources.length} resources limited to ${schoolYear}; another enrollment returns no results`);
