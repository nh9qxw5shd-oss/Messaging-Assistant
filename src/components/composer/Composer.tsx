"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardCopy, Smile, Undo2, Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { buildMessage, buildTeamsHtml } from "@/lib/messageBuilders";
import { captureMessageSnapshot, writeMessageSent } from "@/lib/snapshots/capture";
import { pinForMessage, slotKey } from "@/lib/snapshots/messageSlot";
import { useSentStore, useSentSync } from "@/lib/snapshots/sent";
import BannerPreview from "./BannerPreview";
import EmojiTray from "./EmojiTray";
import { Card } from "@/components/ui";
import { navFor } from "@/lib/nav";
import { BANNER_FILES } from "@/lib/constants";
import { SLOT_LABEL } from "@/lib/engineering/engineeringHub";
import { BUILD_EVENT, COPY_EVENT, MARK_SENT_EVENT } from "@/lib/uiEvents";

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

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
  useSentSync();
  const sent = useSentStore((s) => s.sent);
  const [marking, setMarking] = useState(false);

  // Save progress & build: a local backup plus the slot's snapshot. It never
  // marks the message as sent; that is its own button.
  const build = useCallback(() => {
    const msg = buildMessage(activeTab, { meta, sos, str_am, str_pm, tac, safety_msg });
    setBuiltMessage(msg);
    backupNow("build");
    // Fire-and-forget slot snapshot — never blocks or fails the build.
    captureMessageSnapshot(pinForMessage(activeTab, tac.slot), activeTab, msg, { meta, sos, str_am, str_pm, tac, safety_msg });
    return msg;
  }, [activeTab, meta, sos, str_am, str_pm, tac, safety_msg, setBuiltMessage, backupNow]);

  // The scheduled message in hand (05:30 SoS or the tactical slot); null for
  // messages that are not on the cadence (safety, incident).
  const pin = pinForMessage(activeTab, tac.slot);
  const pinName = pin ? `${SLOT_LABEL[pin.slot]} ${activeTab === "sos" ? "SoS" : "tactical"}` : "";
  const sentAt = pin ? sent[slotKey(pin.snapshotDate, pin.slot)] : undefined;

  async function markSent() {
    const p = pinForMessage(activeTab, tac.slot);
    if (!p || marking) return;
    const name = `${SLOT_LABEL[p.slot]} ${activeTab === "sos" ? "SoS" : "tactical"}`;
    const msg = build();
    if (msg.trim() === "") return;
    setMarking(true);
    try {
      const at = await useSentStore.getState().markSent(p, () =>
        writeMessageSent(p, activeTab, msg, { meta, sos, str_am, str_pm, tac, safety_msg }),
      );
      showToast(`${name} marked as sent at ${hhmm(at)}`);
    } catch (e) {
      showToast(`Not marked as sent: ${e instanceof Error ? e.message : "could not save"}`);
    } finally {
      setMarking(false);
    }
  }

  async function unmarkSent() {
    if (!pin || marking) return;
    setMarking(true);
    try {
      await useSentStore.getState().unmarkSent(pin);
      showToast(`${pinName} no longer marked as sent`);
    } catch (e) {
      showToast(`Could not undo: ${e instanceof Error ? e.message : "could not save"}`);
    } finally {
      setMarking(false);
    }
  }

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
    const onMarkSent = () => { void markSent(); };
    window.addEventListener(BUILD_EVENT, onBuild);
    window.addEventListener(COPY_EVENT, onCopy);
    window.addEventListener(MARK_SENT_EVENT, onMarkSent);
    return () => {
      window.removeEventListener(BUILD_EVENT, onBuild);
      window.removeEventListener(COPY_EVENT, onCopy);
      window.removeEventListener(MARK_SENT_EVENT, onMarkSent);
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
            <kbd className="kbd">Ctrl</kbd><kbd className="kbd">Enter</kbd> to save &amp; build
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
              : "Built message appears here. Fill the form, then Save progress & build."
          }
          className="block h-[42vh] min-h-[220px] w-full resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-faint"
        />
        {!isConfigTab && (
          <div className="flex flex-col gap-2 border-t border-edge p-3">
            <div className="flex gap-2">
              <button onClick={build} className="btn btn-primary flex-1" title="Saves progress and builds the message. Does not mark it as sent.">
                <Wand2 size={15} /> Save progress &amp; build
              </button>
              <button onClick={copy} disabled={!hasMessage} className="btn" title="Builds, then copies for WhatsApp and Teams">
                <ClipboardCopy size={15} /> Copy
              </button>
            </div>
            {pin && (sentAt ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex flex-1 items-center gap-1.5 text-sm" style={{ color: "var(--good)" }}>
                  <CheckCircle2 size={15} /> {pinName} sent at {hhmm(sentAt)}
                </span>
                <button onClick={unmarkSent} disabled={marking} className="btn btn-ghost btn-sm" title="Clear the sent mark if it was made in error">
                  <Undo2 size={14} /> Undo
                </button>
              </div>
            ) : (
              <button onClick={markSent} disabled={marking} className="btn w-full" title="Builds the message and records it as sent; the cockpit logs it and the tactical slot moves on">
                <CheckCircle2 size={15} style={{ color: "var(--good)" }} /> {marking ? "Marking…" : `Mark ${pinName} as sent`}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card title={<span className="inline-flex items-center gap-2"><Smile size={15} /> Emoji tray</span>} subtitle="Click to copy">
        <EmojiTray />
      </Card>
    </>
  );
}
