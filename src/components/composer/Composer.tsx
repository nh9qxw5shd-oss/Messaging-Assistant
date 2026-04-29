"use client";
import { useCallback, useEffect } from "react";
import { useStore } from "@/lib/store";
import { buildMessage, buildTeamsHtml } from "@/lib/messageBuilders";
import BannerPreview from "./BannerPreview";
import EmojiTray from "./EmojiTray";
import AutoTextarea from "@/components/shared/AutoTextarea";
import clsx from "clsx";

export default function Composer() {
  const {
    activeTab,
    builtMessage,
    setBuiltMessage,
    showToast,
    backupNow,
    meta, sos, str_am, str_pm, tac, safety_msg,
  } = useStore();

  const build = useCallback(() => {
    const msg = buildMessage(activeTab, { meta, sos, str_am, str_pm, tac, safety_msg });
    setBuiltMessage(msg);
    backupNow("build");
    return msg;
  }, [activeTab, meta, sos, str_am, str_pm, tac, safety_msg, setBuiltMessage, backupNow]);

  // Keyboard shortcut: Ctrl+Enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") build();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [build]);

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

  const hasMessage = builtMessage.trim().length > 0;
  const isConfigTab = activeTab === "targets";

  return (
    <div className="flex flex-col gap-4">
      {/* Section label */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Composer
        </span>
        <span className="text-[10px] text-muted/50 font-mono">· Ctrl+Enter to build</span>
      </div>

      {/* Banner preview */}
      {!isConfigTab && <BannerPreview activeTab={activeTab} />}

      {/* Output */}
      <AutoTextarea
        value={builtMessage}
        onChange={() => {}}
        readOnly
        placeholder={isConfigTab ? "Select a message tab to build." : "Built message appears here…"}
        minRows={10}
        className="font-mono text-xs leading-relaxed min-h-[200px]"
      />

      {/* Actions */}
      {!isConfigTab && (
        <div className="flex gap-2">
          <button
            onClick={build}
            className={clsx(
              "flex-1 px-4 py-2.5 rounded text-sm font-semibold font-sans",
              "bg-accent text-white border border-accent/80",
              "hover:bg-accent-dim transition-colors duration-150",
              "shadow-orange-glow-sm"
            )}
          >
            Build message
          </button>
          <button
            onClick={copy}
            disabled={!hasMessage}
            className={clsx(
              "px-4 py-2.5 rounded text-sm font-semibold font-sans",
              "bg-panel2 text-ink border border-grid",
              "hover:border-accent/50 transition-colors duration-150",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            Copy
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-grid/60" />

      {/* Emoji tray */}
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Emoji tray · click to copy
      </span>
      <EmojiTray />
    </div>
  );
}
