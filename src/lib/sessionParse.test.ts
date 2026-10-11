import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSession } from "./sessionParse.ts";

describe("parseSession", () => {
  it("reads a saved session", () => {
    assert.deepEqual(parseSession('{"meta":{"route":"East Midlands Route"}}'), { meta: { route: "East Midlands Route" } });
  });
  it("ignores missing, broken or non-object values", () => {
    assert.equal(parseSession(null), null);
    assert.equal(parseSession(""), null);
    assert.equal(parseSession("{oops"), null);
    assert.equal(parseSession("[1,2]"), null);
    assert.equal(parseSession("42"), null);
  });
});
