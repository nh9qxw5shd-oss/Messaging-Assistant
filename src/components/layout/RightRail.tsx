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
      <nav className="flex flex-wrap gap-1 px-4 pt-4 pb-0 border-b border-grid/50">
        {TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "relative px-3.5 py-2.5 rounded-t-lg font-mono text-xs uppercase tracking-wider",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                "transition-all duration-200",
                active
                  ? [
                      "text-accent bg-panel border-t border-x border-grid/70",
                      "-mb-px z-10",
                      "shadow-[0_-2px_12px_rgba(224,82,6,0.08)]",
                    ]
                  : "text-muted hover:text-ink hover:bg-panel2/70"
              )}
            >
              {TAB_LABELS[tab]}
              {/* Animated orange underline on active tab */}
              {active && (
                <span className="absolute bottom-0 inset-x-0 h-px bg-panel" />
              )}
              {active && (
                <span className="absolute top-0 inset-x-4 h-px bg-accent/50 rounded-full animate-fade-in" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Panel — keyed so content animates in on tab switch */}
      <div key={activeTab} className="flex-1 overflow-y-auto p-4 animate-fade-up">
        {TAB_PANELS[activeTab]}
      </div>
    </div>
  );
}
