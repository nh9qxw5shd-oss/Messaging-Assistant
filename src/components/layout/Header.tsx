"use client";
import { useStore } from "@/lib/store";

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Header() {
  const { meta, setMeta, supabaseReady, theme, toggleTheme } = useStore();

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
            text-ink font-sans
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
            text-muted font-mono
            focus:outline-none focus:border-accent/60
            transition-colors
          "
          style={{ colorScheme: theme === "dark" ? "dark" : "light" }}
        />
      </div>

      {/* Status pills + theme toggle */}
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

        {/* Light / dark toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="
            flex items-center justify-center w-7 h-7
            rounded border border-grid
            text-muted hover:text-ink hover:border-accent/50
            transition-colors
          "
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
