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
      glass border-b border-[var(--glass-border)]
      shadow-[0_1px_0_rgba(224,82,6,0.12),0_4px_24px_rgba(0,0,0,0.18)]
    ">
      {/* Logo / wordmark */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Orange message bubble icon */}
        <span className="flex-shrink-0 w-7 h-7 rounded-md bg-accent shadow-orange-glow-sm flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="28" height="21" rx="7" ry="7" fill="white" opacity="0.92"/>
            <path d="M 5 23 L 2 30 L 13 23 Z" fill="white" opacity="0.92"/>
            <rect x="7" y="8.5" width="18" height="3" rx="1.5" fill="#E05206"/>
            <rect x="7" y="14" width="12" height="3" rx="1.5" fill="#E05206"/>
          </svg>
        </span>
        <h1 className="font-display font-semibold text-base text-ink tracking-tight whitespace-nowrap">
          Messaging Assistant
        </h1>
        <span className="font-mono text-[10px] text-muted/70 uppercase tracking-widest bg-panel2 border border-grid px-1.5 py-0.5 rounded-md">v5</span>
      </div>

      {/* Route + timestamp */}
      <div className="flex items-center gap-2 ml-auto">
        <input
          type="text"
          value={meta.route}
          onChange={(e) => setMeta({ route: e.target.value })}
          className="
            w-52 rounded-lg bg-bg/60 border border-grid px-3 py-1.5
            text-ink font-sans text-sm
            hover:border-accent/40 focus:border-accent/60
            placeholder:text-muted/40
          "
          placeholder="Route / Area"
        />
        <input
          type="datetime-local"
          value={meta.stamp}
          onChange={(e) => setMeta({ stamp: e.target.value })}
          className="
            rounded-lg bg-bg/60 border border-grid px-3 py-1.5
            text-muted font-mono text-sm
            hover:border-accent/40 focus:border-accent/60
          "
          style={{ colorScheme: theme === "dark" ? "dark" : "light" }}
        />
      </div>

      {/* Status pills + theme toggle */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted/70 bg-panel2/60 border border-grid/60 rounded-full px-2.5 py-1">
          Autosaves locally
        </span>
        <span className={`font-mono text-[10px] uppercase tracking-widest rounded-full px-2.5 py-1 ${
          supabaseReady
            ? "text-good bg-good/10 border border-good/25"
            : "text-muted/70 bg-panel2/60 border border-grid/60"
        }`}>
          {supabaseReady ? "Supabase ✓" : "Supabase —"}
        </span>

        {/* Light / dark toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="
            flex items-center justify-center w-8 h-8
            rounded-lg border border-grid/70 bg-panel2/50
            text-muted hover:text-ink hover:border-accent/50 hover:bg-accent/10
          "
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
