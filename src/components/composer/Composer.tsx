"use client";
import { useCallback, useEffect } from "react";
import { ClipboardCopy, Smile, Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { buildMessage, buildTeamsHtml } from "@/lib/messageBuilders";
import { captureMessageSnapshot } from "@/lib/snapshots/capture";
import BannerPreview from "./BannerPreview";
import EmojiTray from "./EmojiTray";
import { Card } from "@/components/ui";
import { navFor } from "@/lib/nav";
import { BANNER_FILES } from "@/lib/constants";
import { SLOT_LABEL } from "@/lib/engineering/engineeringHub";
import { BUILD_EVENT, COPY_EVENT } from "@/lib/uiEvents";

export default function Composer() {
  const {
    activeTab,
    builtMessage,
    setBuiltMessage,
    showToast,
    backupNow,
    meta, sos, str_am, str_pm, tac, safety_msg,
  } = useStore();
  const { item } = navFor(activeTab);

  const build = useCallback(() => {
    const msg = buildMessage(activeTab, { meta, sos, str_am, str_pm, tac, safety_msg });
    setBuiltMessage(msg);
    backupNow("build");
    // Fire-and-forget slot snapshot — never blocks or fails the build.
    captureMessageSnapshot(activeTab, msg, { meta, sos, str_am, str_pm, tac, safety_msg });
    return msg;
  }, [activeTab, meta, sos, str_am, str_pm, tac, safety_msg, setBuiltMessage, backupNow]);

  async function copy() {
    const text = build();
    const html = buildTeamsHtml(text, activeTab);
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html":  new Blob([html],  { type: "text/html" }),
            "text/plain": new Blob([text],  { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      showToast("Copied");
    } catch {
      // Last-ditch fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast("Copied");
    }
  }

  // Keyboard shortcut: Ctrl+Enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") build();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [build]);

  // Build / copy requested from the command palette.
  useEffect(() => {
    const onBuild = () => build();
    const onCopy = () => { void copy(); };
    window.addEventListener(BUILD_EVENT, onBuild);
    window.addEventListener(COPY_EVENT, onCopy);
    return () => {
      window.removeEventListener(BUILD_EVENT, onBuild);
      window.removeEventListener(COPY_EVENT, onCopy);
    };
  });

  const hasMessage = builtMessage.trim().length > 0;
  // Targets is config; the incident tab carries its own composer in-panel.
  const isConfigTab = activeTab === "targets" || activeTab === "incident";

  const slotLabel = activeTab === "tactical" ? `${SLOT_LABEL[tac.slot]} · ` : item.time ? `${item.time} · ` : "";

  return (
    <>
      <Card
        title="Message"
        subtitle={`${slotLabel}${item.label}`}
        padded={false}
        action={!isConfigTab && (
          <span className="hidden items-center gap-1 text-xs text-faint sm:inline-flex">
            <kbd className="kbd">Ctrl</kbd><kbd className="kbd">Enter</kbd> to build
          </span>
        )}
      >
        {!isConfigTab && BANNER_FILES[activeTab] && (
          <div className="border-b border-edge bg-sunken px-4 py-3">
            <BannerPreview activeTab={activeTab} />
          </div>
        )}
        <textarea
          readOnly
          value={builtMessage}
          placeholder={
            activeTab === "incident"
              ? "Incident messages build and copy inside the tab."
              : isConfigTab
              ? "Select a message to build."
              : "Built message appears here. Fill the form, then Build."
          }
          className="block h-[42vh] min-h-[220px] w-full resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-faint"
        />
        {!isConfigTab && (
          <div className="flex gap-2 border-t border-edge p-3">
            <button onClick={build} className="btn btn-primary flex-1">
              <Wand2 size={15} /> Build message
            </button>
            <button onClick={copy} disabled={!hasMessage} className="btn" title="Builds, then copies for WhatsApp and Teams">
              <ClipboardCopy size={15} /> Copy
            </button>
          </div>
        )}
      </Card>

      <Card title={<span className="inline-flex items-center gap-2"><Smile size={15} /> Emoji tray</span>} subtitle="Click to copy">
        <EmojiTray />
      </Card>
    </>
  );
}
