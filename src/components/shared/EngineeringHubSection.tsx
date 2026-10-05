"use client";
import { HardHat, RefreshCw } from "lucide-react";
import AutoTextarea from "./AutoTextarea";
import type { AutoMode } from "@/lib/types";
import { Card } from "@/components/ui";

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
  id?: string;
}

const TONE: Record<"ok" | "warn" | "err", string> = { ok: "var(--good)", warn: "var(--moderate)", err: "var(--poor)" };

/**
 * A message section whose text comes from the Engineering Hub: Auto / Manual
 * toggle, Refresh, and a status line in the same tones as the ESR fill.
 */
export default function EngineeringHubSection({
  title, mode, onModeChange, text, onTextChange, readOnlyWhenAuto = false, busy, msg, onRefresh, placeholder, id,
}: Props) {
  const auto = mode === "auto";
  return (
    <Card
      id={id}
      title={<span className="inline-flex items-center gap-2"><HardHat size={15} className="text-accent" /> {title}</span>}
      subtitle={msg ? <span style={{ color: TONE[msg.tone] }}>{msg.text}</span> : auto ? "From the Engineering Hub" : "Manual text"}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5" role="group" aria-label={`${title} source`}>
            {([
              ["auto", "Auto from Hub"],
              ["manual", "Manual"],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" className="chip" aria-pressed={mode === value} onClick={() => onModeChange(value)}>
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy || !auto}
            title={auto ? "Re-read the critical items from the Engineering Hub" : "Switch to Auto to refresh from the Engineering Hub"}
            className="btn btn-ghost btn-sm"
          >
            {busy ? <span className="spinner" /> : <RefreshCw size={13} />} {busy ? "Reading…" : "Refresh"}
          </button>
        </div>
      }
    >
      <AutoTextarea
        value={text}
        onChange={onTextChange}
        readOnly={auto && readOnlyWhenAuto}
        placeholder={placeholder}
        className="font-mono text-[13px]"
      />
    </Card>
  );
}
