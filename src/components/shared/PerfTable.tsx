"use client";
import { useEffect, useRef } from "react";
import type { TargetMetric } from "@/lib/types";
import { rag } from "@/lib/ragLogic";
import clsx from "clsx";

interface Props {
  metrics: TargetMetric[];
  locked?: boolean; // true = name/target/amber read-only (perf view); false = targets admin
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
        "w-full resize-none bg-transparent leading-snug",
        "focus:outline-none placeholder:text-muted/50",
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
}: {
  value: number | string;
  onChange: (v: number | string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      step="any"
      value={value}
      disabled={disabled}
      placeholder={placeholder ?? "–"}
      onChange={(e) =>
        onChange(e.target.value === "" ? "" : Number(e.target.value))
      }
      className={clsx(
        "w-full bg-transparent text-center",
        "focus:outline-none placeholder:text-muted/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    />
  );
}

export default function PerfTable({ metrics, locked = true, onUpdate, onRemove }: Props) {
  const thCls = "font-mono uppercase tracking-widest text-muted pb-2 text-left px-2";
  const tdCls = "px-2 py-1.5 border-b border-grid/40 align-top";

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={clsx(thCls, "w-8 text-center")}>RAG</th>
            <th className={thCls}>Metric</th>
            <th className={clsx(thCls, "w-16 text-center")}>Value</th>
            <th className={clsx(thCls, "w-16 text-center")}>Target</th>
            <th className={clsx(thCls, "w-16 text-center")}>Amber</th>
            <th className={clsx(thCls, "w-28")}>Direction</th>
            <th className={thCls}>Notes</th>
            {!locked && onRemove && <th className={clsx(thCls, "w-8")} />}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => {
            const ragEmoji = rag(m);
            return (
              <tr
                key={i}
                className="group hover:bg-panel2/50 transition-colors"
              >
                {/* RAG */}
                <td className={clsx(tdCls, "text-center text-base leading-none")}>
                  {ragEmoji}
                </td>

                {/* Metric name */}
                <td className={tdCls}>
                  <input
                    type="text"
                    value={m.name}
                    disabled={locked}
                    onChange={(e) => onUpdate(i, { name: e.target.value })}
                    className={clsx(
                      "w-full bg-transparent text-ink focus:outline-none",
                      locked && "opacity-70 cursor-not-allowed"
                    )}
                  />
                </td>

                {/* Value — always editable */}
                <td className={tdCls}>
                  <NumberInput
                    value={m.value}
                    onChange={(v) => onUpdate(i, { value: v })}
                  />
                </td>

                {/* Target */}
                <td className={tdCls}>
                  <NumberInput
                    value={m.target}
                    onChange={(v) => onUpdate(i, { target: v })}
                    disabled={locked}
                  />
                </td>

                {/* Amber */}
                <td className={tdCls}>
                  <NumberInput
                    value={m.amber}
                    onChange={(v) => onUpdate(i, { amber: v })}
                    disabled={locked}
                  />
                </td>

                {/* Direction */}
                <td className={tdCls}>
                  <select
                    value={m.dir}
                    disabled={locked}
                    onChange={(e) =>
                      onUpdate(i, { dir: e.target.value as "higher" | "lower" })
                    }
                    className={clsx(
                      "w-full bg-transparent focus:outline-none cursor-pointer",
                      locked && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <option value="higher">↑ higher</option>
                    <option value="lower">↓ lower</option>
                  </select>
                </td>

                {/* Notes — always editable */}
                <td className={tdCls}>
                  <AutoExpandTextarea
                    value={m.notes}
                    onChange={(v) => onUpdate(i, { notes: v })}
                    placeholder="Notes"
                  />
                </td>

                {/* Remove button (unlocked only) */}
                {!locked && onRemove && (
                  <td className={clsx(tdCls, "text-center")}>
                    <button
                      onClick={() => onRemove(i)}
                      className="text-muted hover:text-bad transition-colors leading-none"
                      title="Remove metric"
                    >
                      ✕
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
