"use client";
import { useStore } from "@/lib/store";

export default function Header() {
  const { meta, setMeta, supabaseReady } = useStore();

  return (
    <header className="
      sticky top-0 z-40
      flex items-center gap-4 px-5 py-3
      bg-panel border-b border-grid
      shadow-[0_1px_0_rgba(224,82,6,0.15)]
    ">
      {/* Logo / wordmark */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-1.5 h-5 rounded-sm bg-accent shadow-orange-glow-sm flex-shrink-0" />
        <h1 className="font-display font-semibold text-base text-ink tracking-tight whitespace-nowrap">
          Messaging Assistant
        </h1>
        <span className="font-mono text-[10px] text-muted uppercase tracking-widest">v5</span>
      </div>

      {/* Route + timestamp */}
      <div className="flex items-center gap-2 ml-auto">
        <input
          type="text"
          value={meta.route}
          onChange={(e) => setMeta({ route: e.target.value })}
          className="
            w-52 rounded bg-bg border border-grid px-2.5 py-1.5
            text-sm text-ink font-sans
            focus:outline-none focus:border-accent/60
            transition-colors placeholder:text-muted/50
          "
          placeholder="Route / Area"
        />
        <input
          type="datetime-local"
          value={meta.stamp}
          onChange={(e) => setMeta({ stamp: e.target.value })}
          className="
            rounded bg-bg border border-grid px-2.5 py-1.5
            text-sm text-muted font-mono
            focus:outline-none focus:border-accent/60
            transition-colors
            [color-scheme:dark]
          "
        />
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted border border-grid rounded px-2 py-1">
          Autosaves locally
        </span>
        <span className={`font-mono text-[10px] uppercase tracking-widest border rounded px-2 py-1 ${
          supabaseReady
            ? "text-good border-good/30"
            : "text-muted border-grid"
        }`}>
          {supabaseReady ? "Supabase ✓" : "Supabase —"}
        </span>
      </div>
    </header>
  );
}
