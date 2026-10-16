"use client";
import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { NAV_ITEMS } from "@/lib/nav";
import {
  autoSelectCurrentPeriod,
  fetchSeasonalTemplates,
  supabase,
} from "@/lib/supabase";
import { BACKUP_INTERVAL_MS } from "@/lib/constants";
import { startLivePerf } from "@/lib/rdm/livePerfClient";
import AppShell from "@/components/AppShell";
import { FeedbackProvider } from "@/components/uiFeedback";
import ToastBridge from "@/components/ToastBridge";
import Composer from "@/components/composer/Composer";
import IncidentPreview from "@/components/incident/IncidentPreview";
import EmojiTray from "@/components/composer/EmojiTray";
import { Card } from "@/components/ui";
import { Smile } from "lucide-react";
import type { TabKey } from "@/lib/types";
import SoSTab          from "@/components/tabs/SoSTab";
import StrategicAMTab  from "@/components/tabs/StrategicAMTab";
import StrategicPMTab  from "@/components/tabs/StrategicPMTab";
import TacticalTab     from "@/components/tabs/TacticalTab";
import SafetyTab       from "@/components/tabs/SafetyTab";
import IncidentTab     from "@/components/tabs/IncidentTab";
import TargetsTab      from "@/components/tabs/TargetsTab";
import { useLiveStorage } from "@/lib/liveStorage";
import { useLiveSync } from "@/lib/live/sync";

const TAB_PANELS: Record<TabKey, React.ReactNode> = {
  sos:          <SoSTab />,
  strategic_am: <StrategicAMTab />,
  strategic_pm: <StrategicPMTab />,
  tactical:     <TacticalTab />,
  safety_msg:   <SafetyTab />,
  incident:     <IncidentTab />,
  targets:      <TargetsTab />,
};

export default function Page() {
  const {
    hydrate,
    setTargets,
    setTargetPeriods,
    setActiveTargetPeriodId,
    setSeasonalTemplates,
    setSupabaseReady,
    backupNow,
    theme,
    activeTab,
    setActiveTab,
  } = useStore();

  // ─── Hydrate session state from localStorage ─────────────────────────────
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ─── Take in saves made by other open copies (hub frame, other tabs) ─────
  useLiveStorage();

  // ─── Shared draft: the same content in every copy on every machine ───────
  useLiveSync();

  // ─── Deep link: ?tab=<key> (the hub's links and cadence) wins over the saved tab
  const urlTab = useRef<string | null>(null);
  useEffect(() => {
    const tab = new URL(window.location.href).searchParams.get("tab");
    if (!tab || !NAV_ITEMS.some((n) => n.tab === tab)) return;
    urlTab.current = tab;
    setActiveTab(tab as TabKey);
  }, [setActiveTab]);

  // ─── The address follows the open tab (?tab=<key>), so the hub can show which
  // section is open and a reload stays on it. Waits for a deep link to land first.
  useEffect(() => {
    if (urlTab.current) {
      if (activeTab !== urlTab.current) return;
      urlTab.current = null;
    }
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") === activeTab) return;
    url.searchParams.set("tab", activeTab);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [activeTab]);

  // ─── Apply theme to <html> (tokens switch on data-theme) ─────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // ─── Load Supabase config ─────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;

    async function loadSupabase() {
      try {
        // Auto-select the railway period containing today (Insight railway
        // calendar) and load its targets alongside the seasonal templates.
        const [{ period, targets, periods }, templates] = await Promise.all([
          autoSelectCurrentPeriod(),
          fetchSeasonalTemplates(),
        ]);

        if (targets.length > 0) setTargets(targets);
        setTargetPeriods(periods);
        setActiveTargetPeriodId(period.id);
        setSeasonalTemplates(templates);
        setSupabaseReady(true);
      } catch (err) {
        console.warn("Supabase load failed — using local defaults:", err);
      }
    }

    loadSupabase();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Live performance polling (every 2 min while open) ──────────────────
  useEffect(() => startLivePerf(), []);

  // ─── Autosave backup every 5 min ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => backupNow("auto"), BACKUP_INTERVAL_MS);
    const beforeUnload = () => backupNow("exit");
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [backupNow]);

  const isTargets = activeTab === "targets";

  return (
    <FeedbackProvider>
      <ToastBridge />
      <AppShell>
        {/* Form on the left; the composer (or the incident preview) sits in a
            sticky panel on the right from xl, and below the form on smaller screens. */}
        <div className={isTargets ? "" : "grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]"}>
          <div key={activeTab} className="fade-in min-w-0">
            {TAB_PANELS[activeTab]}
          </div>
          {!isTargets && (
            <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-[calc(var(--topbar-h)+1.25rem)] xl:max-h-[calc(100vh-var(--topbar-h)-2.5rem)] xl:overflow-y-auto">
              {activeTab === "incident" ? (
                <>
                  <IncidentPreview />
                  <Card title={<span className="inline-flex items-center gap-2"><Smile size={15} /> Emoji tray</span>} subtitle="Click to copy">
                    <EmojiTray />
                  </Card>
                </>
              ) : (
                <Composer />
              )}
            </aside>
          )}
        </div>
      </AppShell>
    </FeedbackProvider>
  );
}
