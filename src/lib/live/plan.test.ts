import { test } from "node:test";
import assert from "node:assert/strict";
import { planSync } from "./plan.ts";

test("a section not in the database is seeded from this copy", () => {
  const p = planSync("sos", undefined, { a: 1 }, null);
  assert.equal(p.push, true);
  assert.equal(p.known.rev, 0);
});

test("first read on a browser takes the shared copy", () => {
  const p = planSync("tac", undefined, { intro: "old" }, { rev: 5, state: { intro: "shared" } });
  assert.deepEqual(p.apply, { intro: "shared" });
  assert.equal(p.push, false);
  assert.deepEqual(p.known, { rev: 5, base: { intro: "shared" } });
});

test("unchanged elsewhere: push only if this copy changed", () => {
  const known = { rev: 5, base: { a: 1 } };
  assert.equal(planSync("sos", known, { a: 1 }, { rev: 5, state: { a: 1 } }).push, false);
  assert.equal(planSync("sos", known, { a: 2 }, { rev: 5, state: { a: 1 } }).push, true);
});

test("changed elsewhere, nothing here: take theirs, no write", () => {
  const p = planSync("sos", { rev: 5, base: { a: 1 } }, { a: 1 }, { rev: 7, state: { a: 2 } });
  assert.deepEqual(p.apply, { a: 2 });
  assert.equal(p.push, false);
});

test("both changed different fields: merge, show it here and write it back", () => {
  const p = planSync("tac", { rev: 5, base: { a: 1, b: 1 } }, { a: 2, b: 1 }, { rev: 7, state: { a: 1, b: 2 } });
  assert.deepEqual(p.apply, { a: 2, b: 2 });
  assert.equal(p.push, true);
  assert.deepEqual(p.known, { rev: 7, base: { a: 1, b: 2 } });
  assert.deepEqual(p.conflicts, []);
});

test("the same edit arriving from elsewhere (another tab) needs no write", () => {
  const p = planSync("sos", { rev: 5, base: { a: 1 } }, { a: 2 }, { rev: 6, state: { a: 2 } });
  assert.equal(p.apply, undefined);
  assert.equal(p.push, false);
});

test("incidents merge by id", () => {
  const p = planSync("incidents", { rev: 1, base: [] }, [{ id: "x" }], { rev: 2, state: [{ id: "y" }] });
  assert.deepEqual(p.apply, [{ id: "x" }, { id: "y" }]);
  assert.equal(p.push, true);
});

test("a read older than the last agreed version is ignored", () => {
  const p = planSync("tac", { rev: 9, base: { a: "new" } }, { a: "newer" }, { rev: 7, state: { a: "old" } });
  assert.equal(p.apply, undefined);
  assert.equal(p.push, false);
  assert.equal(p.known.rev, 9);
});
