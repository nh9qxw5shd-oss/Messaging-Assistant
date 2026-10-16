"use client";

// Keeps every open copy of the Assistant on the latest saved state.
//
// The Assistant can be open in several places at once: its own address, the Derby Control hub
// (which keeps the two addresses' browser storage in step) and other tabs. Each copy reads its
// saved session once at start and writes the whole session back on every change, so a copy left
// open would put its old session back over a newer one. Listening for storage changes made by the
// other copies and taking them in straight away means the most recent save wins everywhere.
// Taking a change in never writes it back. Copies on other machines are kept in step by the
// shared draft (live/sync.ts); its bookkeeping key (LS_LIVE_KEY) is per copy and not taken in.

import { useEffect } from "react";
import { LS_LIVEPERF_KEY, LS_SESSION_KEY } from "./constants";
import { LS_INCIDENTS_KEY } from "./incident/constants";
import { useIncidentStore } from "./incident/store";
import { loadMovedOn, MOVED_ON_KEY, useSentStore } from "./snapshots/sent";
import { useStore } from "./store";

export function useLiveStorage(): void {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return;
      // key null: storage cleared elsewhere; nothing sensible to take in.
      if (e.key === LS_SESSION_KEY) useStore.getState().applySavedSession(e.newValue);
      else if (e.key === LS_LIVEPERF_KEY) useStore.getState().applyLivePerfSetting(e.newValue);
      else if (e.key === LS_INCIDENTS_KEY) {
        if (useIncidentStore.getState().hydrated) useIncidentStore.getState().reload();
      } else if (e.key === MOVED_ON_KEY) useSentStore.setState({ movedOn: loadMovedOn() });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
