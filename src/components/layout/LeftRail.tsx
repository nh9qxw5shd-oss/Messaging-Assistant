"use client";
import { useStore } from "@/lib/store";
import Card from "@/components/shared/Card";
import Composer from "@/components/composer/Composer";
import IncidentPreview from "@/components/incident/IncidentPreview";
import EmojiTray from "@/components/composer/EmojiTray";

export default function LeftRail() {
  const { activeTab } = useStore();

  return (
    <Card className="p-4 flex flex-col gap-0 lg:sticky lg:top-[57px] lg:max-h-[calc(100vh-57px)] overflow-y-auto">
      {activeTab === "incident" ? (
        <div className="flex flex-col gap-4">
          <IncidentPreview />
          <div className="border-t border-grid/60" />
          <span className="font-mono uppercase tracking-widest text-muted">
            Emoji tray · click to copy
          </span>
          <EmojiTray />
        </div>
      ) : (
        <Composer />
      )}
    </Card>
  );
}
