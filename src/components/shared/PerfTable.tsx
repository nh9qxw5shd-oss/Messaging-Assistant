"use client";
import { useEffect, useRef } from "react";
import type { TargetMetric } from "@/lib/types";
import { rag } from "@/lib/ragLogic";
import { SOS_ONLY_METRIC } from "@/lib/constants";
import clsx from "clsx";
import { X } from "lucide-react";
import { StatusDot } from "@/components/ui";

/** Dot colour for the RAG emoji the message uses. */
function ragColor(emoji: string): string {
  if (emoji === "🟢") return "var(--good)";
  if (emoji === "🟡" || emoji === "🟠") return "var(--moderate)";
  if (emoji === "🔴") return "var(--poor)";
  return "var(--text-faint)";
}

interface Props {
  metrics: TargetMetric[];
  locked?: boolean; // true = name/target read-only (perf view); false = targets admin. Amber is always auto-calculated.
  onUpdate: (index: number, partial: Partial<TargetMetric>) => void;
  onRemove?: (index: number) => void; // only shown when not locked
}

function AutoExpandTextarea({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={clsx(
        "input resize-none !py-1 text-[13px] leading-snug",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    />
  );
}

function NumberInput({
  value,
  onChange,
  disabled,
  placeholder,
  suffix,
  color,
}: {
  value: number | string;
  onChange: (v: number | string) => void;
  disabled?: boolean;
  placeholder?: string;
  suffix?: string;
  color?: string;
}) {
  const input = (
    <input
      type="number"
      step="any"
      value={value}
      disabled={disabled}
      placeholder={placeholder ?? "–"}
      onChange={(e) =>
        onChange(e.target.value === "" ? "" : Number(e.target.value))
      }
      style={color ? { color } : undefined}
      className={clsx(
        "w-full min-w-[3.5rem] text-right font-mono tabular-nums",
        disabled
          ? "cursor-default bg-transparent px-1 py-1 text-dim outline-none"
          : "input !px-2 !py-1 font-semibold"
      )}
    />
  );
  if (!suffix) return input;
  return (
    <div className="flex items-center gap-0.5">
      {input}
      <span className="shrink-0 text-faint">{suffix}</span>
    </div>
  );
}

export default function PerfTable({ metrics, locked = true, onUpdate, onRemove }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead>
          <tr>
            <th className="w-10 text-center">RAG</th>
            <th>Metric</th>
            <th className="w-24 text-right">Value</th>
            <th className="w-20 text-right">Target</th>
            <th className="w-20 text-right">Amber</th>
            <th className="w-32">Better</th>
            <th className="min-w-[10rem]">Notes</th>
            {!locked && onRemove && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => {
            const ragEmoji = rag(m);
            const color = ragColor(ragEmoji);
            const hasValue = m.value !== "" && m.value !== null && m.value !== undefined;
            return (
              <tr key={i}>
                {/* RAG */}
                <td className="!align-middle text-center" title={ragEmoji}>
                  <StatusDot color={color} />
                </td>

                {/* Metric name */}
                <td className="!align-middle">
                  {locked ? (
                    <span className="font-semibold">{m.name}</span>
                  ) : (
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => onUpdate(i, { name: e.target.value })}
                      className="input !py-1"
                    />
                  )}
                </td>

                {/* Value — always editable */}
                <td>
                  <NumberInput
                    value={m.value}
                    onChange={(v) => onUpdate(i, { value: v })}
                    suffix={m.name.trim().toLowerCase() === SOS_ONLY_METRIC ? "%" : undefined}
                    color={hasValue ? color : undefined}
                  />
                </td>

                {/* Target */}
                <td>
                  <NumberInput
                    value={m.target}
                    onChange={(v) => onUpdate(i, { target: v })}
                    disabled={locked}
                  />
                </td>

                {/* Amber — auto-calculated from target, never editable */}
                <td title="Auto-calculated: target −5 (higher-is-better) or +0.5 (lower-is-better)">
                  <NumberInput
                    value={m.amber}
                    onChange={() => {}}
                    disabled
                  />
                </td>

                {/* Direction */}
                <td className="!align-middle">
                  {locked ? (
                    <span className="text-dim">{m.dir === "lower" ? "↓ lower" : "↑ higher"}</span>
                  ) : (
                    <select
                      value={m.dir}
                      onChange={(e) =>
                        onUpdate(i, { dir: e.target.value as "higher" | "lower" })
                      }
                      className="input min-w-[7.5rem] cursor-pointer !py-1"
                    >
                      <option value="higher">↑ higher</option>
                      <option value="lower">↓ lower</option>
                    </select>
                  )}
                </td>

                {/* Notes — always editable */}
                <td>
                  <AutoExpandTextarea
                    value={m.notes}
                    onChange={(v) => onUpdate(i, { notes: v })}
                    placeholder="Notes"
                  />
                </td>

                {/* Remove button (unlocked only) */}
                {!locked && onRemove && (
                  <td className="!align-middle text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      className="btn btn-ghost btn-icon btn-sm hover:!text-poor"
                      title="Remove metric"
                      aria-label={`Remove ${m.name}`}
                    >
                      <X size={14} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
