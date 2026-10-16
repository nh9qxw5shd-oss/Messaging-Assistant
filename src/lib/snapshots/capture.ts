import { supabase } from "../supabase";
import { parseSnapshotMetrics } from "./slots";
import type { MessagePin, SentVia } from "./messageSlot";
import type { AppStore } from "../store";
import type { TabKey, TargetMetric } from "../types";

type SessionSlice = Pick<
  AppStore,
  "meta" | "sos" | "str_am" | "str_pm" | "tac" | "safety_msg"
>;

function tabState(tab: TabKey, s: SessionSlice): { state: unknown; perf: TargetMetric[] } {
  switch (tab) {
    case "sos":          return { state: s.sos,        perf: s.sos.perf };
    case "strategic_am": return { state: s.str_am,     perf: s.str_am.perf };
    case "strategic_pm": return { state: s.str_pm,     perf: s.str_pm.perf };
    case "tactical":     return { state: s.tac,        perf: s.tac.perf };
    case "safety_msg":   return { state: s.safety_msg, perf: [] };
    default:             return { state: null,         perf: [] };
  }
}

function snapshotParams(pin: MessagePin, tab: TabKey, message: string, session: SessionSlice) {
  const { state, perf } = tabState(tab, session);
  return {
    p_snapshot_date:    pin.snapshotDate,
    p_slot:             pin.slot,
    p_tab:              tab,
    p_message:          message,
    p_payload:          { meta: session.meta, state },
    p_metrics:          parseSnapshotMetrics(perf),
    p_metrics_for_date: pin.metricsForDate,
  };
}

/**
 * Save progress: capture a snapshot of a built message against its own slot
 * (pinForMessage). Fire-and-forget: never throws, never blocks message
 * building — any failure (Supabase unconfigured, network down, RPC error) is
 * logged and swallowed. Messages without a slot (safety, incident) are not
 * captured.
 */
export function captureMessageSnapshot(
  pin: MessagePin | null,
  tab: TabKey,
  message: string,
  session: SessionSlice,
): void {
  try {
    if (!supabase || !pin || message.trim() === "") return;
    Promise.resolve(supabase.rpc("ma_capture_message_snapshot", snapshotParams(pin, tab, message, session)))
      .then(({ error }) => {
        if (error) console.warn("Message snapshot capture failed:", error.message);
      })
      .catch((e) => console.warn("Message snapshot capture failed:", e));
  } catch (e) {
    console.warn("Message snapshot capture skipped:", e);
  }
}

/**
 * Mark a message as sent: store it as the slot's snapshot of record and stamp
 * sent_at, recording whether it was logged on copy or by hand. Resolves to the
 * sent time; throws if it could not be saved, so the desk is told rather than
 * left thinking it was logged.
 */
export async function writeMessageSent(
  pin: MessagePin,
  tab: TabKey,
  message: string,
  session: SessionSlice,
  via: SentVia = "manual",
): Promise<string> {
  if (!supabase) throw new Error("Database not connected, so the sent mark was not saved");
  const fn = via === "copy" ? "ma_mark_message_sent_on_copy" : "ma_mark_message_sent";
  const { data, error } = await supabase.rpc(fn, snapshotParams(pin, tab, message, session));
  if (error) throw new Error(error.message);
  return typeof data === "string" ? data : new Date().toISOString();
}
