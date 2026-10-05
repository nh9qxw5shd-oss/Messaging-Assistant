"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
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
  } = useStore();

  // ─── Hydrate session state from localStorage ─────────────────────────────
  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
