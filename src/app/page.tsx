"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import {
  fetchActiveTargets,
  fetchTargetPeriods,
  fetchSeasonalTemplates,
  supabase,
} from "@/lib/supabase";
import { BACKUP_INTERVAL_MS } from "@/lib/constants";
import Header    from "@/components/layout/Header";
import LeftRail  from "@/components/layout/LeftRail";
import RightRail from "@/components/layout/RightRail";
import Card      from "@/components/shared/Card";
import Toast     from "@/components/shared/Toast";

export default function Page() {
  const {
    hydrate,
    setTargets,
    setTargetPeriods,
    setSeasonalTemplates,
    setSupabaseReady,
    backupNow,
    toast,
    theme,
  } = useStore();

  // ─── Hydrate session state from localStorage ─────────────────────────────
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ─── Apply theme class to <html> ─────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // ─── Load Supabase config ─────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;

    async function loadSupabase() {
      try {
        const [activeTargets, periods, templates] = await Promise.all([
          fetchActiveTargets(),
          fetchTargetPeriods(),
          fetchSeasonalTemplates(),
        ]);

        if (activeTargets.length > 0) setTargets(activeTargets);
        setTargetPeriods(periods);
        setSeasonalTemplates(templates);
        setSupabaseReady(true);
      } catch (err) {
        console.warn("Supabase load failed — using local defaults:", err);
      }
    }

    loadSupabase();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <>
      <Header />
      <main className="flex gap-4 p-4 items-start min-h-[calc(100vh-57px)]">
        {/* Left rail — fixed width composer */}
        <div className="w-80 flex-shrink-0">
          <LeftRail />
        </div>

        {/* Right rail — tabs */}
        <div className="flex-1 min-w-0">
          <Card noPad className="min-h-[calc(100vh-89px)]">
            <RightRail />
          </Card>
        </div>
      </main>

      <Toast message={toast} />
    </>
  );
}
