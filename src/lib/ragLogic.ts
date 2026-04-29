import type { TargetMetric } from "./types";
import { SOS_ONLY_METRIC } from "./constants";

// ─── RAG emoji ────────────────────────────────────────────────────────────────

// Hard-coded rule for Current Period Variance:
//   >= 0  → green   (above zero)
//   >= -5 → amber   (below zero but within -5)
//   <  -5 → red
function ragVariance(num: number): string {
  if (num >= 0) return "🟢";
  if (num >= -5) return "🟠";
  return "🔴";
}

export function rag(metric: TargetMetric): string {
  const v = metric.value;
  if (v === "" || v === null || v === undefined) return "⚪";
  const num = Number(v);
  if (isNaN(num)) return "⚪";

  if (metric.name.trim().toLowerCase() === SOS_ONLY_METRIC) {
    return ragVariance(num);
  }

  const t = Number(metric.target);
  const a = Number(metric.amber);

  if (metric.dir === "lower") {
    return num <= t ? "🟢" : num <= a ? "🟠" : "🔴";
  }
  return num >= t ? "🟢" : num >= a ? "🟠" : "🔴";
}

// ─── Legacy square → circle emoji normalisation ───────────────────────────────

const STATUS_EMOJI_MAP: Record<string, string> = {
  "🟩": "🟢",
  "🟨": "🟡",
  "🟧": "🟠",
  "🟥": "🔴",
  "⬛": "⚫",
};

export function normalizeStatusEmoji(text: string): string {
  if (!text) return "";
  // Use spread to get first full codepoint (not first UTF-16 code unit)
  const first = [...text.trim()][0] ?? "";
  const mapped = STATUS_EMOJI_MAP[first];
  if (mapped) return text.replace(first, mapped);
  return text;
}

// ─── Canvas-based pixel padding for colon alignment ───────────────────────────

let _canvas: HTMLCanvasElement | null = null;
const PAD_FONT = '14px "Segoe UI", Roboto, Arial, sans-serif';

function measureTextPx(txt: string): number {
  if (typeof window === "undefined") return txt.length * 8; // SSR fallback
  if (!_canvas) _canvas = document.createElement("canvas");
  const ctx = _canvas.getContext("2d");
  if (!ctx) return txt.length * 8;
  ctx.font = PAD_FONT;
  return ctx.measureText(txt).width;
}

function padLabelPx(label: string, targetPx: number): string {
  let s = label;
  let guard = 0;
  while (measureTextPx(s) < targetPx && guard < 40) {
    s += " ";
    guard++;
  }
  return `${s} : `;
}

export function statusLinePx(label: string, status: string, targetPx: number): string {
  return padLabelPx(label, targetPx) + normalizeStatusEmoji(status ?? "");
}

// ─── Performance table → output lines ────────────────────────────────────────

export function linesFromPerf(arr: TargetMetric[]): string {
  return arr
    .map((m) => {
      const e = rag(m);
      const isVariance = m.name.trim().toLowerCase() === SOS_ONLY_METRIC;
      const displayValue = m.value !== "" && isVariance ? `${m.value}%` : m.value;
      const parts = [`${e} ${m.name}: ${displayValue}`];
      if (!isVariance && m.target !== "") parts.push(`(Tgt ${m.target})`);
      if (m.notes) parts.push(`– ${m.notes}`);
      return parts.join(" ");
    })
    .join("\n");
}
