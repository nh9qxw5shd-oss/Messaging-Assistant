import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { absoluteAsset, withBase } from "./basePath.ts";

describe("basePath", () => {
  it("prefixes root-relative paths only", () => {
    assert.equal(withBase("/api/performance", "/messaging"), "/messaging/api/performance");
    assert.equal(withBase("/favicon.svg", ""), "/favicon.svg");
    assert.equal(withBase("https://x.test/a", "/messaging"), "https://x.test/a");
    assert.equal(withBase("//cdn.test/a", "/messaging"), "//cdn.test/a");
  });
  it("builds absolute banner URLs from the origin", () => {
    const b = "/banners/sos.png";
    assert.equal(absoluteAsset("https://messaging.derbycontrol.co.uk", b, "/messaging"), "https://messaging.derbycontrol.co.uk/messaging/banners/sos.png");
    assert.equal(absoluteAsset("https://messaging.derbycontrol.co.uk/", b, "/messaging"), "https://messaging.derbycontrol.co.uk/messaging/banners/sos.png");
    assert.equal(absoluteAsset("https://overseer.derbycontrol.co.uk/messaging", b, "/messaging"), "https://overseer.derbycontrol.co.uk/messaging/banners/sos.png");
    assert.equal(absoluteAsset("", b, "/messaging"), "");
  });
});
