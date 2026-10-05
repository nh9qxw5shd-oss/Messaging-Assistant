// Navigation model for the app shell and the command palette. The Messaging
// Assistant stays on one URL: each item switches the active message tab in the
// store rather than routing.
import { Clock3, LucideIcon, ShieldAlert, Siren, Sun, Sunrise, Sunset, Target } from "lucide-react";
import { VISIBLE_TABS } from "./constants";
import type { TabKey } from "./types";

export interface NavItem {
  tab: TabKey;
  label: string;
  /** Message time(s), shown beside the label. */
  time?: string;
  icon: LucideIcon;
  desc: string;
}
export interface NavGroup { label: string; items: NavItem[] }

const GROUPS: NavGroup[] = [
  {
    label: "Scheduled",
    items: [
      { tab: "sos", label: "Start of Service", time: "05:30", icon: Sunrise, desc: "Overnight recap, on-call, ESRs, weather and the overnight engineering outcomes" },
      { tab: "strategic_am", label: "Strategic AM", time: "11:00", icon: Sun, desc: "Morning strategic update" },
      { tab: "strategic_pm", label: "Strategic PM", time: "20:00", icon: Sunset, desc: "Evening strategic update" },
      { tab: "tactical", label: "Tactical", time: "09 · 15 · 22", icon: Clock3, desc: "Route performance, late running and critical engineering; the slot follows the London clock" },
    ],
  },
  {
    label: "As required",
    items: [
      { tab: "safety_msg", label: "Safety message", icon: ShieldAlert, desc: "Safety incident or accident notification" },
      { tab: "incident", label: "Incident messaging", icon: Siren, desc: "Initial, update and final incident messages" },
    ],
  },
  {
    label: "Settings",
    items: [
      { tab: "targets", label: "Targets & thresholds", icon: Target, desc: "Performance targets and amber thresholds by railway period" },
    ],
  },
];

/** Groups with hidden tabs (constants.HIDDEN_TABS) left out. */
export const NAV: NavGroup[] = GROUPS
  .map((g) => ({ ...g, items: g.items.filter((i) => VISIBLE_TABS.includes(i.tab)) }))
  .filter((g) => g.items.length > 0);

export const NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);

const ALL: Record<string, { item: NavItem; group: string }> = Object.fromEntries(
  GROUPS.flatMap((g) => g.items.map((i) => [i.tab, { item: i, group: g.label }])),
);
export function navFor(tab: TabKey): { item: NavItem; group: string } {
  return ALL[tab];
}

/** Message tabs (the composer builds for these; Targets is configuration). */
export function isMessageTab(tab: TabKey): boolean {
  return tab !== "targets";
}
