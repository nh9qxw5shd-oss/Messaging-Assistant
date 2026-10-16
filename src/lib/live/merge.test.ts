import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeById, mergeRecord, sameValue } from "./merge.ts";

test("sameValue ignores key order and treats a missing key as undefined", () => {
  assert.equal(sameValue({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 }), true);
  assert.equal(sameValue({ a: 1 }, { a: 1, b: undefined }), true);
  assert.equal(sameValue({ a: [1, 2] }, { a: [2, 1] }), false);
  assert.equal(sameValue(null, {}), false);
});

test("each side keeps the fields it changed", () => {
  const base = { intro: "Hi", rcm: "A", status: "Green" };
  const local = { ...base, intro: "Hello" };
  const remote = { ...base, rcm: "B" };
  const m = mergeRecord(base, local, remote);
  assert.deepEqual(m.value, { intro: "Hello", rcm: "B", status: "Green" });
  assert.deepEqual(m.conflicts, []);
});

test("both changing the same field keeps this copy's and reports it", () => {
  const base = { intro: "Hi" };
  const m = mergeRecord(base, { intro: "Mine" }, { intro: "Theirs" });
  assert.deepEqual(m.value, { intro: "Mine" });
  assert.deepEqual(m.conflicts, ["intro"]);
  // Same change on both sides is not a conflict.
  assert.deepEqual(mergeRecord(base, { intro: "Same" }, { intro: "Same" }).conflicts, []);
});

test("nested fields merge as a whole field", () => {
  const base = { late: { gtr20: "1", emr20: "2" } };
  const m = mergeRecord(base, { late: { gtr20: "9", emr20: "2" } }, { late: { gtr20: "1", emr20: "2" } });
  assert.deepEqual(m.value, { late: { gtr20: "9", emr20: "2" } });
});

test("no agreed base: the database wins", () => {
  assert.deepEqual(mergeRecord(undefined, { a: 1 }, { a: 2 }).value, { a: 2 });
});

test("a field removed here is removed", () => {
  assert.deepEqual(mergeRecord({ a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2 }).value, { a: 1 });
});

const inc = (id: string, narrative = "") => ({ id, narrative });

test("incidents: new on either side are kept, at the top", () => {
  const base = [inc("a")];
  const m = mergeById(base, [inc("l"), inc("a")], [inc("r"), inc("a")]);
  assert.deepEqual(m.value.map((i) => i.id), ["l", "r", "a"]);
});

test("incidents: a deletion holds unless the other side changed it", () => {
  const base = [inc("a"), inc("b")];
  assert.deepEqual(mergeById(base, [inc("b")], base).value.map((i) => i.id), ["b"]);
  assert.deepEqual(mergeById(base, [inc("b")], [inc("a", "edited"), inc("b")]).value.map((i) => i.id), ["a", "b"]);
  assert.deepEqual(mergeById(base, base, [inc("b")]).value.map((i) => i.id), ["b"]);
});

test("incidents: fields merge within one incident", () => {
  const base = [{ id: "a", narrative: "", phase: "holding" }];
  const m = mergeById(base, [{ id: "a", narrative: "Line blocked", phase: "holding" }], [{ id: "a", narrative: "", phase: "initial" }]);
  assert.deepEqual(m.value, [{ id: "a", narrative: "Line blocked", phase: "initial" }]);
});
