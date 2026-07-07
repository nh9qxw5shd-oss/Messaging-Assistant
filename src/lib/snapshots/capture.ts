import { supabase } from "../supabase";
import { parseSnapshotMetrics, resolveSnapshotSlot } from "./slots";
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

/**
 * Capture a snapshot of a built message, pinned to the next approaching slot.
 * Fire-and-forget: never throws, never blocks message building — any failure
 * (Supabase unconfigured, network down, RPC error) is logged and swallowed.
 */
export function captureMessageSnapshot(
  tab: TabKey,
  message: string,
  session: SessionSlice,
  now: Date = new Date()
): void {
  try {
    if (!supabase || tab === "targets" || message.trim() === "") return;

    const pin = resolveSnapshotSlot(now);
    const { state, perf } = tabState(tab, session);

    Promise.resolve(
      supabase.rpc("ma_capture_message_snapshot", {
        p_snapshot_date:    pin.snapshotDate,
        p_slot:             pin.slot,
        p_tab:              tab,
        p_message:          message,
        p_payload:          { meta: session.meta, state },
        p_metrics:          parseSnapshotMetrics(perf),
        p_metrics_for_date: pin.metricsForDate,
      })
    )
      .then(({ error }) => {
        if (error) console.warn("Message snapshot capture failed:", error.message);
      })
      .catch((e) => console.warn("Message snapshot capture failed:", e));
  } catch (e) {
    console.warn("Message snapshot capture skipped:", e);
  }
}
