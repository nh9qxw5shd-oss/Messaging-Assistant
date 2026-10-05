"use client";
import clsx from "clsx";
import AutoTextarea from "./AutoTextarea";
import type { AutoMode } from "@/lib/types";

export type FillMsg = { tone: "ok" | "warn" | "err"; text: string } | null;

interface Props {
  title: string;
  mode: AutoMode;
  onModeChange: (mode: AutoMode) => void;
  text: string;
  onTextChange: (value: string) => void;
  /** Tactical shows the fetched text read-only while on auto; SoS keeps it editable. */
  readOnlyWhenAuto?: boolean;
  busy: boolean;
  msg: FillMsg;
  onRefresh: () => void;
  placeholder?: string;
}

const btnCls = "rounded border border-grid bg-panel2 px-3 py-1 font-mono text-xs uppercase tracking-widest text-ink/80 hover:border-accent hover:text-ink disabled:opacity-50 disabled:hover:border-grid disabled:hover:text-ink/80";

/**
 * A message section whose text comes from the Engineering Hub: Auto / Manual
 * toggle, Refresh, and a status line in the same tones as the ESR fill.
 */
export default function EngineeringHubSection({
  title, mode, onModeChange, text, onTextChange, readOnlyWhenAuto = false, busy, msg, onRefresh, placeholder,
}: Props) {
  const auto = mode === "auto";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-sans font-semibold text-ink/80 mb-2">{title}</h4>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded border border-grid" role="group" aria-label={`${title} source`}>
            {([
              ["auto", "Auto from Engineering Hub"],
              ["manual", "Manual"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onModeChange(value)}
                aria-pressed={mode === value}
                className={clsx(
                  "px-3 py-1 font-mono text-xs uppercase tracking-widest transition-colors",
                  mode === value ? "bg-accent text-white" : "bg-panel2 text-muted hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy || !auto}
            title={auto ? "Re-read the critical items from the Engineering Hub" : "Switch to Auto to refresh from the Engineering Hub"}
            className={btnCls}
          >
            {busy ? "Reading Hub…" : "Refresh"}
          </button>
        </div>
      </div>
      {msg && (
        <p
          className={clsx(
            "-mt-1 text-xs",
            msg.tone === "ok" && "text-emerald-400",
            msg.tone === "warn" && "text-amber-400",
            msg.tone === "err" && "text-red-400",
          )}
        >
          {msg.text}
        </p>
      )}
      <AutoTextarea
        value={text}
        onChange={onTextChange}
        readOnly={auto && readOnlyWhenAuto}
        placeholder={placeholder}
      />
    </div>
  );
}
