"use client";
// Command palette (Ctrl/Cmd + K): jump to any message, or build / copy the
// current one, or switch theme, by typing.
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardCopy, CornerDownLeft, LucideIcon, Moon, Search, Wand2 } from "lucide-react";
import { useHotkey } from "@/lib/hooks";
import { NAV_ITEMS, isMessageTab } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { PALETTE_EVENT, requestBuild, requestCopy } from "@/lib/uiEvents";

interface Item { id: string; group: string; title: string; hint?: string; icon: LucideIcon; keywords?: string; run: () => void }

function score(item: Item, q: string): number {
  const hay = `${item.title} ${item.hint ?? ""} ${item.keywords ?? ""}`.toLowerCase();
  if (!q) return 1;
  let s = 0;
  for (const t of q.split(/\s+/).filter(Boolean)) {
    if (item.title.toLowerCase().startsWith(t)) s += 3;
    else if (item.title.toLowerCase().includes(t)) s += 2;
    else if (hay.includes(t)) s += 1;
    else return 0;
  }
  return s;
}

export function CommandPalette() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);

  function show() { setQ(""); setCursor(0); setOpen(true); }
  useHotkey("mod+k", () => (open ? setOpen(false) : show()), { inInputs: true });
  useHotkey("escape", () => setOpen(false), { inInputs: true });
  useEffect(() => { const on = () => show(); window.addEventListener(PALETTE_EVENT, on); return () => window.removeEventListener(PALETTE_EVENT, on); }, []);

  const items = useMemo<Item[]>(() => {
    const actions: Item[] = [];
    if (isMessageTab(activeTab) && activeTab !== "incident") {
      actions.push(
        { id: "a-build", group: "Actions", title: "Build message", hint: "Ctrl + Enter", icon: Wand2, keywords: "build compose generate", run: requestBuild },
        { id: "a-copy", group: "Actions", title: "Build and copy message", hint: "Copies for WhatsApp and Teams", icon: ClipboardCopy, keywords: "copy clipboard whatsapp teams", run: requestCopy },
      );
    }
    actions.push({ id: "a-theme", group: "Actions", title: "Switch light / dark theme", icon: Moon, keywords: "theme light dark mode", run: toggleTheme });
    const pages: Item[] = NAV_ITEMS.map((n) => ({
      id: `p-${n.tab}`, group: "Messages", title: n.label, hint: n.time ? `${n.time} · ${n.desc}` : n.desc, icon: n.icon,
      keywords: `${n.tab} ${n.time ?? ""}`, run: () => { setActiveTab(n.tab); window.scrollTo({ top: 0 }); },
    }));
    return [...pages, ...actions];
  }, [activeTab, setActiveTab, toggleTheme]);

  const needle = q.trim().toLowerCase();
  const results = useMemo(
    () => (needle ? items.map((it) => ({ it, s: score(it, needle) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.it) : items),
    [needle, items],
  );

  const resultsKey = `${needle}|${results.length}`;
  const [seenKey, setSeenKey] = useState(resultsKey);
  if (seenKey !== resultsKey) { setSeenKey(resultsKey); setCursor(0); }

  function go(item: Item) { setOpen(false); item.run(); }
  if (!open) return null;

  const groups: { name: string; items: Item[] }[] = [];
  for (const it of results) { const g = groups.find((x) => x.name === it.group); if (g) g.items.push(it); else groups.push({ name: it.group, items: [it] }); }
  let idx = -1;

  return (
    <div className="backdrop flex items-start justify-center px-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div role="dialog" aria-modal aria-label="Command palette" className="card scale-in w-full max-w-xl overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-edge px-3">
          <Search size={16} className="text-faint" />
          <input autoFocus className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-faint" style={{ outline: "none" }} placeholder="Jump to a message, or build, copy, switch theme…" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); if (results[cursor]) go(results[cursor]); }
            }} />
          <kbd className="kbd">Esc</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1.5">
          {results.length === 0 && <p className="px-3 py-6 text-center text-sm text-dim">Nothing matches “{q}”.</p>}
          {groups.map((g) => (
            <div key={g.name} className="mb-1">
              <div className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-faint">{g.name}</div>
              {g.items.map((it) => {
                idx += 1; const i = idx; const active = i === cursor;
                return (
                  <button key={it.id} className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${active ? "text-ink" : "text-dim hover:bg-hover hover:text-ink"}`} style={active ? { background: "var(--accent-soft)" } : undefined} onMouseEnter={() => setCursor(i)} onClick={() => go(it)}>
                    <it.icon size={16} className={active ? "text-accent" : "text-faint"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{it.title}</span>
                      {it.hint && <span className="block truncate text-xs text-faint">{it.hint}</span>}
                    </span>
                    {active ? <CornerDownLeft size={14} className="text-faint" /> : <ArrowRight size={14} className="opacity-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-edge px-3 py-2 text-[11px] text-faint">
          <span className="flex items-center gap-1"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="kbd">↵</kbd> run</span>
          <span className="ml-auto flex items-center gap-1"><kbd className="kbd">Ctrl</kbd><kbd className="kbd">Enter</kbd> builds from anywhere</span>
        </div>
      </div>
    </div>
  );
}
