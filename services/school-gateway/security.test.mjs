import { test } from "node:test";
import assert from "node:assert/strict";
import { queries, queryByName, requireIdentity } from "./queries.mjs";
test("all business queries are SELECT only, bounded and scoped by parent", () => {
  for (const query of Object.values(queries)) {
    assert.match(query, /^(SELECT|WITH)\b/);
    assert.match(query, /\bTOP \(\d+\)/);
    assert.match(query, /@parentId/);
    assert.doesNotMatch(
      query,
      /\b(INSERT|UPDATE|DELETE|MERGE|EXEC|DROP|ALTER|INTO)\b/i,
    );
  }
});
test("arbitrary queries and prototype keys are rejected", () => {
  for (const name of [
    "DELETE FROM Parent",
    "__proto__",
    "constructor",
    "toString",
  ])
    assert.throws(() => queryByName(name));
});
test("fake identities cannot acquire a school mapping", () => {
  assert.throws(() => requireIdentity("demo-parent", { "demo-parent": 12 }));
  assert.throws(() => requireIdentity("missing", {}));
  assert.throws(() => requireIdentity("__proto__", {}));
  assert.equal(requireIdentity("school-user-1", { "school-user-1": 42 }), 42);
});
test("all enrollment reads enforce current parent and school year", () => {
  for (const [name, q] of Object.entries(queries)) {
    if (name !== "children") {
      assert.match(q, /@enrollmentId/);
      assert.match(q, /EXISTS/);
      assert.match(q, /Annee_Encours=1/);
    }
  }
});
