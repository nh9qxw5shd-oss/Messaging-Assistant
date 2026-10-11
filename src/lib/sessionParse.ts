// Reading a saved session back from browser storage. Pure.

import type { SessionState } from "./types.ts";

/** A saved session, or null when the value is missing or not a session. */
export function parseSession(raw: string | null): Partial<SessionState> | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Partial<SessionState>) : null;
  } catch {
    return null;
  }
}
