// Badge colour and short label for an operational status line (LONG_OPS /
// SHORT_OPS), read from its leading emoji.
const COLOR: Record<string, string> = {
  "🟢": "var(--good)",
  "🟡": "var(--moderate)",
  "🟠": "var(--accent)",
  "🔴": "var(--poor)",
  "⚫": "var(--verypoor)",
};

export function opsStatusBadge(status: string): { color: string; label: string } | null {
  const s = (status ?? "").trim();
  if (!s) return null;
  const emoji = Object.keys(COLOR).find((e) => s.startsWith(e));
  if (!emoji) return null;
  const label = s.slice(emoji.length).split(":")[0].trim().replace(/ Operations$/, "").replace(/ Disruption$/, "");
  return { color: COLOR[emoji], label };
}
