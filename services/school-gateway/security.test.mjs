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
test("school-year data is dynamically limited to the active enrollment year", () => {
  for (const query of Object.values(queries))
    assert.doesNotMatch(query, /\b20\d{2}\s*\/\s*20\d{2}\b/);

  for (const name of [
    "latestMarks",
    "markDetails",
    "competencies",
    "activities",
    "journey",
    "yearResults",
    "subjectResults",
    "termResults",
  ])
    assert.match(
      queries[name],
      /(?:Annee_ID|Activite_AnneId)=\(SELECT TOP \(1\)[\s\S]*Annee_Encours=1/,
      `${name} must bind its rows to the active school year`,
    );

  for (const name of ["latestMarks", "markDetails", "competencies", "journey", "yearResults", "subjectResults", "termResults"])
    assert.match(
      queries[name],
      /EtudiantNiveauAnnee_ID=@enrollmentId/,
      `${name} must bind rows to the active enrollment`,
    );
  assert.match(
    queries.teachers,
    /Classe_ID=\(SELECT TOP \(1\)[\s\S]*Annee_Encours=1/,
    "teachers must be scoped to the active class",
  );
});
