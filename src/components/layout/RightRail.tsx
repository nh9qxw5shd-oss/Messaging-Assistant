"use client";
import { useStore } from "@/lib/store";
import { TABS, TAB_LABELS } from "@/lib/constants";
import type { TabKey } from "@/lib/types";
import SoSTab          from "@/components/tabs/SoSTab";
import StrategicAMTab  from "@/components/tabs/StrategicAMTab";
import StrategicPMTab  from "@/components/tabs/StrategicPMTab";
import TacticalTab     from "@/components/tabs/TacticalTab";
import SafetyTab       from "@/components/tabs/SafetyTab";
import TargetsTab      from "@/components/tabs/TargetsTab";
import clsx from "clsx";

const TAB_PANELS: Record<TabKey, React.ReactNode> = {
  sos:          <SoSTab />,
  strategic_am: <StrategicAMTab />,
  strategic_pm: <StrategicPMTab />,
  tactical:     <TacticalTab />,
  safety_msg:   <SafetyTab />,
  targets:      <TargetsTab />,
};

export default function RightRail() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <div className="flex flex-col gap-0 min-h-0">
      {/* Tab nav */}
      <nav className="flex flex-wrap gap-1.5 px-4 pt-4 pb-0 border-b border-grid/60">
        {TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "relative px-3 py-2 rounded-t font-mono uppercase tracking-wider transition-all duration-150",
                "focus:outline-none",
                active
                  ? "text-accent bg-panel border-t border-x border-grid -mb-px z-10"
                  : "text-muted hover:text-ink hover:bg-panel2/60"
              )}
            >
              {TAB_LABELS[tab]}
              {active && (
                <span className="absolute bottom-0 inset-x-0 h-px bg-panel" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Panel */}
      <div className="flex-1 overflow-y-auto p-4">
        {TAB_PANELS[activeTab]}
      </div>
    </div>
  );
}
