"use client";
// Application shell in the house style: grouped sidebar with a sliding active
// indicator, a top bar carrying the command palette (Ctrl/⌘ K), store and
// autosave status, the London clock and the theme toggle. The Messaging
// Assistant stays on one URL, so nav items switch the active tab in the store.
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Database, Menu, Moon, PanelLeftClose, PanelLeftOpen, Save, Search, Sun, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLocalStorage, useMounted, useNow } from "@/lib/hooks";
import { NAV } from "@/lib/nav";
import { openPalette } from "@/lib/uiEvents";
import { CommandPalette } from "@/components/CommandPalette";
import { StatusDot, fmtDay, fmtTime } from "@/components/ui";

// ------------------------------------------------------------------ brand

// Message bubble in Network Rail orange.
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#F26522" />
      <path d="M9 10.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4.5 3.5v-3.5H9a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" fill="none" stroke="#1a1204" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M11.5 15h9M11.5 18h5.5" stroke="#1a1204" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- sidebar

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const ind = indicatorRef.current;
    if (!list || !ind) return;
    const active = list.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) { ind.style.opacity = "0"; return; }
    const lr = list.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    ind.style.opacity = "1";
    ind.style.transform = `translateY(${ar.top - lr.top + 6}px)`;
    ind.style.height = `${ar.height - 12}px`;
  }, [activeTab]);

  return (
    <div ref={listRef} className="relative">
      <span ref={indicatorRef} className="nav-indicator" style={{ top: 0, opacity: 0 }} />
      {NAV.map((g) => (
        <div key={g.label}>
          <div className="nav-group-label">{g.label}</div>
          {g.items.map((it) => {
            const active = it.tab === activeTab;
            return (
              <button
                key={it.tab}
                type="button"
                className="nav-item w-[calc(100%-1rem)] text-left"
                aria-current={active ? "page" : undefined}
                title={it.desc}
                onClick={() => { setActiveTab(it.tab); onNavigate?.(); window.scrollTo({ top: 0 }); }}
              >
                <it.icon size={17} strokeWidth={2.1} />
                <span className="nav-label flex flex-1 items-baseline justify-between gap-2">
                  <span>{it.label}</span>
                  {it.time && <span className="font-mono text-[10.5px] font-medium text-faint">{it.time}</span>}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className="sidebar hidden lg:flex">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <BrandMark />
        <span className="nav-label leading-tight">
          <span className="block text-[15px] font-extrabold tracking-tight">Messaging Assistant</span>
          <span className="block text-[11px] font-semibold text-faint">East Midlands Control Centre</span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto pb-4"><SidebarNav /></div>
      <div className="border-t border-edge p-2">
        <button className="nav-item w-[calc(100%-1rem)] text-faint" onClick={onToggle} title={collapsed ? "Expand navigation" : "Collapse navigation"}>
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          <span className="nav-label text-xs">Collapse</span>
        </button>
      </div>
    </aside>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="backdrop lg:hidden" onMouseDown={onClose}>
      <div className="sheet flex h-full w-72 max-w-[85vw] flex-col border-r border-edge bg-sunken" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-4">
          <span className="flex items-center gap-2.5"><BrandMark /><span className="text-[15px] font-extrabold">Messaging Assistant</span></span>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto pb-6"><SidebarNav onNavigate={onClose} /></div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- topbar

function StoreChip() {
  const ok = useStore((s) => s.supabaseReady);
  const color = ok ? "var(--good)" : "var(--text-faint)";
  return (
    <span
      className="hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold sm:inline-flex"
      style={{ color, borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}
      title={ok ? "Targets, periods and templates loaded from Supabase" : "Supabase not loaded — using local defaults"}
    >
      <StatusDot color={color} />
      <Database size={12} /> {ok ? "Supabase" : "Local defaults"}
    </span>
  );
}

/** Time of the newest local backup (autosave every 5 min, on build and on close). */
function AutosaveChip() {
  const getBackups = useStore((s) => s.getBackups);
  const now = useNow(30_000);
  const [last, setLast] = useState<number | null>(null);
  useEffect(() => {
    const list = getBackups();
    setLast(list.length ? list[list.length - 1].ts : null);
  }, [now, getBackups]);
  return (
    <span className="hidden items-center gap-1.5 rounded-md border border-edge px-2 py-1 text-[11px] font-semibold text-dim lg:inline-flex" title="The session autosaves to this browser every 5 minutes, on each build and on close">
      <Save size={12} /> {last ? <>Autosaved <span className="font-mono">{fmtTime(new Date(last).toISOString())}</span></> : "Autosaves locally"}
    </span>
  );
}

function Clock() {
  const now = useNow(15000);
  const mounted = useMounted();
  // The page is prerendered at build time, so the time only renders in the browser.
  if (!mounted) {
    return (
      <span className="hidden items-baseline gap-1.5 text-sm md:inline-flex" aria-hidden>
        <span className="font-mono text-base font-semibold tabular-nums text-faint">--:--</span>
      </span>
    );
  }
  return (
    <span className="hidden items-baseline gap-1.5 text-sm md:inline-flex" title="Europe/London">
      <span className="font-mono text-base font-semibold tabular-nums">{fmtTime(now.toISOString())}</span>
      <span className="text-xs text-dim">{fmtDay(now.toISOString())}</span>
    </span>
  );
}

function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const toggle = useStore((s) => s.toggleTheme);
  // The store reads the saved theme at load; the server always renders dark.
  const light = useMounted() && theme === "light";
  return (
    <button className="btn btn-ghost btn-icon" onClick={toggle} aria-label={light ? "Switch to dark theme" : "Switch to light theme"} title={light ? "Switch to dark theme" : "Switch to light theme"}>
      <span key={theme} className="pop inline-flex">{light ? <Moon size={17} /> : <Sun size={17} />}</span>
    </button>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="topbar glass flex items-center gap-2 px-3 sm:px-4">
      <button className="btn btn-ghost btn-icon lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu size={18} /></button>
      <span className="flex items-center gap-2 lg:hidden"><BrandMark size={22} /><span className="text-sm font-extrabold">Messaging Assistant</span></span>
      <button className="btn btn-ghost ml-1 hidden min-w-[240px] justify-start gap-2 border border-edge bg-sunken text-dim sm:flex" onClick={() => openPalette()} title="Jump to a message or run an action">
        <Search size={15} />
        <span className="flex-1 text-left text-xs font-medium">Jump to or run…</span>
        <span className="flex gap-0.5"><kbd className="kbd">Ctrl</kbd><kbd className="kbd">K</kbd></span>
      </button>
      <button className="btn btn-ghost btn-icon sm:hidden" onClick={() => openPalette()} aria-label="Command palette"><Search size={18} /></button>
      <div className="flex-1" />
      <StoreChip />
      <AutosaveChip />
      <Clock />
      <ThemeToggle />
    </header>
  );
}

// ------------------------------------------------------------------ shell

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorage("ma_nav_collapsed", false);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-shell" data-collapsed={collapsed ? "true" : "false"}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-col">
        <TopBar onMenu={() => setMenuOpen(true)} />
        <main className="content flex-1">{children}</main>
        <footer className="content !py-4 text-xs text-faint">Messaging Assistant · East Midlands Control Centre, Derby · critical engineering fills from the Engineering Hub</footer>
      </div>
      <CommandPalette />
    </div>
  );
}
