import { renderSafetyMessage } from "../renderer";
import type { SafetyIncidentState } from "../types";
import * as fs from "fs";
import * as path from "path";

const FIXTURES_DIR = path.join(__dirname, "../../../../../docs/safety-message-builder/examples");

interface Fixture {
  description: string;
  input: SafetyIncidentState;
  expected: string;
}

function normalise(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

describe("Safety message renderer — fixture tests", () => {
  const files = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const fixture: Fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, file), "utf-8")
    );

    test(`${file}: ${fixture.description}`, () => {
      const rendered = renderSafetyMessage(fixture.input);
      expect(normalise(rendered)).toBe(normalise(fixture.expected));
    });
  }
});
