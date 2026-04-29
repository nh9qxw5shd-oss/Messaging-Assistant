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
        <span className="font-mono text-xs uppercase tracking-widest text-muted/80">
          Composer
        </span>
        <span className="text-muted/40 font-mono text-xs">· Ctrl+Enter to build</span>
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
        className="font-mono leading-relaxed min-h-[200px] max-h-[45vh] overflow-y-auto rounded-xl bg-bg/60 border border-grid/60"
      />

      {/* Actions */}
      {!isConfigTab && (
        <div className="flex gap-2">
          <button
            onClick={build}
            className={clsx(
              "flex-1 px-4 py-2.5 rounded-xl font-semibold font-sans text-sm",
              "bg-accent text-white",
              "hover:bg-accent-dim hover:shadow-orange-glow",
              "shadow-orange-glow-sm",
              "active:scale-[0.97]",
            )}
          >
            Build message
          </button>
          <button
            onClick={copy}
            disabled={!hasMessage}
            className={clsx(
              "px-4 py-2.5 rounded-xl font-semibold font-sans text-sm",
              "bg-panel2/80 text-ink border border-grid/70",
              "hover:border-accent/50 hover:bg-panel2",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "active:scale-[0.97]",
            )}
          >
            Copy
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-grid/40" />

      {/* Emoji tray */}
      <span className="font-mono text-xs uppercase tracking-widest text-muted/80">
        Emoji tray · click to copy
      </span>
      <EmojiTray />
    </div>
  );
}
