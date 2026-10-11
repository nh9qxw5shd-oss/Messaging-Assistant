import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeTacticalSlot,
  nextTacticalSlot,
  pinForMessage,
  slotKey,
  sosSlotDate,
  tacticalSlotDate,
} from "./messageSlot.ts";

// October 2026 is BST (UTC+1): London 09:00 is 08:00Z.
const bst = (hhmm: string, day = "2026-10-11") => new Date(`${day}T${hhmm}:00+01:00`);
// January is GMT.
const gmt = (hhmm: string, day = "2027-01-12") => new Date(`${day}T${hhmm}:00Z`);

test("auto stays on 09:00 until an hour after it, then moves on", () => {
  assert.deepEqual(activeTacticalSlot(bst("07:00")), { slot: "0900", dateISO: "2026-10-11" });
  assert.deepEqual(activeTacticalSlot(bst("09:20")), { slot: "0900", dateISO: "2026-10-11" });
  assert.deepEqual(activeTacticalSlot(bst("09:59")), { slot: "0900", dateISO: "2026-10-11" });
  assert.deepEqual(activeTacticalSlot(bst("10:00")), { slot: "1500", dateISO: "2026-10-11" });
});

test("marking sent moves on straight away", () => {
  const done = new Set([slotKey("2026-10-11", "0900")]);
  assert.deepEqual(activeTacticalSlot(bst("09:05"), done), { slot: "1500", dateISO: "2026-10-11" });
  assert.deepEqual(activeTacticalSlot(bst("08:40"), done), { slot: "1500", dateISO: "2026-10-11" });
});

test("15:00 and 22:00 have the same grace", () => {
  assert.equal(activeTacticalSlot(bst("15:45")).slot, "1500");
  assert.equal(activeTacticalSlot(bst("16:00")).slot, "2200");
  assert.deepEqual(activeTacticalSlot(bst("22:30")), { slot: "2200", dateISO: "2026-10-11" });
});

test("after 22:00 is sent or past grace, auto shows tomorrow's 09:00", () => {
  assert.deepEqual(activeTacticalSlot(bst("23:00")), { slot: "0900", dateISO: "2026-10-12" });
  const done = new Set([slotKey("2026-10-11", "2200")]);
  assert.deepEqual(activeTacticalSlot(bst("22:10"), done), { slot: "0900", dateISO: "2026-10-12" });
  assert.deepEqual(activeTacticalSlot(bst("21:55"), done), { slot: "0900", dateISO: "2026-10-12" });
});

test("small hours show the coming 09:00", () => {
  assert.deepEqual(activeTacticalSlot(bst("00:30")), { slot: "0900", dateISO: "2026-10-11" });
  assert.deepEqual(activeTacticalSlot(bst("05:30")), { slot: "0900", dateISO: "2026-10-11" });
});

test("works the same in GMT", () => {
  assert.equal(activeTacticalSlot(gmt("09:30")).slot, "0900");
  assert.equal(activeTacticalSlot(gmt("10:01")).slot, "1500");
});

test("all three done skips to the next 09:00", () => {
  const done = new Set(["0900", "1500", "2200"].map((s) => slotKey("2026-10-11", s as "0900")));
  done.add(slotKey("2026-10-12", "0900"));
  assert.deepEqual(activeTacticalSlot(bst("21:50"), done), { slot: "0900", dateISO: "2026-10-13" });
});

test("a slot's date is its nearest occurrence", () => {
  assert.equal(tacticalSlotDate("0900", bst("14:00")), "2026-10-11");
  assert.equal(tacticalSlotDate("0900", bst("22:30")), "2026-10-12");
  assert.equal(tacticalSlotDate("2200", bst("00:20", "2026-10-12")), "2026-10-11");
  assert.equal(tacticalSlotDate("1500", bst("15:40")), "2026-10-11");
});

test("SoS belongs to today, or tomorrow from 22:00", () => {
  assert.equal(sosSlotDate(bst("05:33")), "2026-10-11");
  assert.equal(sosSlotDate(bst("21:59")), "2026-10-11");
  assert.equal(sosSlotDate(bst("22:00")), "2026-10-12");
});

test("a build is logged against its own message, not the next clock slot", () => {
  // The SoS built at 05:33 is the 05:30 SoS, not the 09:00 tactical.
  assert.deepEqual(pinForMessage("sos", "0900", bst("05:33")), {
    snapshotDate: "2026-10-11", slot: "0530", metricsForDate: "2026-10-10",
  });
  // The 09:00 tactical built at 09:20 stays the 09:00.
  assert.deepEqual(pinForMessage("tactical", "0900", bst("09:20")), {
    snapshotDate: "2026-10-11", slot: "0900", metricsForDate: "2026-10-11",
  });
  assert.equal(pinForMessage("safety_msg", "0900", bst("09:20")), null);
  assert.equal(pinForMessage("incident", "0900", bst("09:20")), null);
});

test("move on cycles through the three slots", () => {
  assert.equal(nextTacticalSlot("0900"), "1500");
  assert.equal(nextTacticalSlot("1500"), "2200");
  assert.equal(nextTacticalSlot("2200"), "0900");
});
