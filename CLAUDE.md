# Messaging Assistant

Next.js App Router, TypeScript, Supabase (shared "Mini Project Hub" project). Builds
the tactical (09:00 / 15:00 / 22:00) and SoS (05:30) WhatsApp messages.

## Working here
- Checks before any push: `npm run lint`, `npm run type-check`, `npm test`
  (`node --test`, so relative imports of runtime code carry the `.ts` suffix),
  `npm run build`.
- The critical engineering sections are filled from the Engineering Hub (the rebuilt
  WON Splitter) through `eng_critical_items`. `src/lib/engineering/criticalMessage.ts`
  is a verbatim copy of the Hub's `src/lib/critical/criticalMessage.ts` and must stay
  byte-identical; change both or neither.
- The tactical slot follows the London clock, with a manual override that an "Auto"
  button re-engages. A customised intro is never overwritten; auto text only replaces
  a blank field or the last auto-filled text.

## Design language: Autumn Hub (default for every rebuild and new system)

Unless the request says otherwise, any new system or rebuild uses the Autumn Hub
design language for styling, navigation and overall feel. The canonical source is
`nh9qxw5shd-oss/autumn-hub` under `web/src/`:

- `app/globals.css` — tokens and the whole component stylesheet (copy it, drop the
  viz-only tokens if there are no charts). Dark theme by default, light theme via
  `data-theme="light"` on `<html>`.
- `components/ui.tsx` — the kit: PageHeader, ActionBar, Card, Badge, Field, Stat,
  CountUp, Chips, Kbd, EmptyState, Spinner, Skeleton, PageSkeleton, CopyButton,
  StatusDot, SectionTitle, Drawer, Steps. Buttons, inputs, tables and switches are
  stylesheet classes (`.btn .btn-primary .btn-ghost .btn-danger .btn-sm .btn-icon`,
  `.input`, `.tbl`, `.lbl`, `.switch`, `.chip`, `.card .card-link`).
- `components/uiFeedback.tsx` — `FeedbackProvider` with `useToast` (success / error /
  info) and `useDialog` (confirm / prompt). No bespoke toast or modal components.
- `components/AppShell.tsx` + `components/Nav.tsx` — app-shell grid: collapsible
  sidebar with grouped nav and sliding indicator, topbar (palette button, status chip,
  clock, theme toggle), mobile bottom nav, page transition wrapper, footer.
- `components/CommandPalette.tsx` — Ctrl+K palette: pages, actions and live search.
- `app/layout.tsx` — `next/font/local` Manrope (sans) and JetBrains Mono (mono) from
  `app/fonts/`, plus the inline theme-init script so there is no theme flash.

Core tokens: `--bg #0b0e13`, `--bg-raised #12161d`, `--border #222a35`, `--text #e8ebf0`,
`--text-dim #98a2b3`, accent amber `--accent #f5a524`, status bands `--good #34d399`,
`--damp #38bdf8`, `--moderate #fbbf24`, `--poor #f87171`, `--verypoor #c084fc`.
Radii 14 / 10 / 7px; motion `--dur 220ms` with `--ease cubic-bezier(.2,.8,.2,1)`.

Conventions that go with it:
- Next.js App Router + TypeScript strict + Tailwind v4 (`@tailwindcss/postcss`,
  `@import "tailwindcss"`, tokens exposed through `@theme inline`). Utilities for
  layout, kit classes for components.
- Brand mark in the sidebar uses Network Rail orange `#F26522`; favicons are NR orange
  on a transparent background.
- Lists of dated or grouped records use a collapsible per group with a summary in the
  header, only the current group open by default.
- Keep the copied stylesheet and kit in step with Autumn Hub by hand; do not add a
  runtime dependency on the Autumn Hub repo.
- Mobile width (390px) must work with no horizontal scroll; verify with a screenshot.

Writing and commits: no model names or identifiers in code, README, commit messages
or PR text. Professional, concise, industry terms retained (WON, PICOP, PPS ref, OTM,
ES, SoS, tactical).
