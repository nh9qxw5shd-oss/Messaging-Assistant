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
    <div className="grid grid-cols-6 gap-1.5">
      {EMOJI_TRAY.map((ch) => (
        <button
          key={ch}
          onClick={() => copy(ch)}
          title="Click to copy"
          className="
            flex items-center justify-center
            rounded border border-grid bg-panel2
            py-2 text-lg leading-none
            hover:border-accent/50 hover:bg-panel
            transition-colors duration-100
            font-[emoji] cursor-pointer
          "
          style={{ fontFamily: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",system-ui' }}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
