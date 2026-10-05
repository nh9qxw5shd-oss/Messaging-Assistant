"use client";
import { EMOJI_TRAY } from "@/lib/constants";
import { useStore } from "@/lib/store";

export default function EmojiTray() {
  const showToast = useStore((s) => s.showToast);

  async function copy(ch: string) {
    try {
      await navigator.clipboard.writeText(ch);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = ch;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    showToast(`Copied ${ch}`);
  }

  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9 xl:grid-cols-6">
      {EMOJI_TRAY.map((ch) => (
        <button
          key={ch}
          type="button"
          onClick={() => copy(ch)}
          title="Click to copy"
          className="emoji flex h-10 items-center justify-center rounded-lg border border-edge bg-sunken text-lg leading-none transition-colors hover:border-accent hover:bg-hover"
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
