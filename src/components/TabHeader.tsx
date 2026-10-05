"use client";
// Page header for a message tab: group eyebrow, title, message time and
// description from the nav model, with the tab's own controls on the right.
import type { ReactNode } from "react";
import { navFor } from "@/lib/nav";
import type { TabKey } from "@/lib/types";
import { Badge, PageHeader } from "@/components/ui";

export default function TabHeader({ tab, actions, badge, subtitle }: { tab: TabKey; actions?: ReactNode; badge?: ReactNode; subtitle?: ReactNode }) {
  const { item, group } = navFor(tab);
  return (
    <PageHeader
      eyebrow={group}
      title={item.label}
      badge={badge ?? (item.time ? <Badge color="var(--accent)">{item.time}</Badge> : undefined)}
      subtitle={subtitle ?? item.desc}
      actions={actions}
    />
  );
}
