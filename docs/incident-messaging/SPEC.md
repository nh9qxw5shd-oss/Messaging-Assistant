# Significant Incident Messaging — Framework (v1)

**Purpose**: Add a significant-incident messaging section to the Messaging Assistant so the SNDM can run the full messaging cycle for a Red/Black incident — holding message, initial alert, numbered updates, normal working resumed, service recovery — from a single incident record, in a fraction of the time the current standalone tool takes. Output must be indistinguishable from the established WhatsApp corpus, and the banner set from the existing tool must remain available.

**Empirical basis**: 2,718 messages across two WhatsApp incident-advice channels (EM North — 1,588 msgs; EM South London & Bedford Critical Corridor — 1,130 msgs), Nov 2019 – Jul 2026, plus a review of the existing tool at <https://sndm-em.github.io/Incident-Messaging/>.

---

## 1. What the corpus actually shows

### 1.1 The lifecycle

Incidents in the corpus follow a consistent cycle, though not every incident uses every phase:

```
(Holding message) → Initial alert → Update 1..N → Normal working resumed → (Service recovery) → (Final DSF)
```

- **Holding message** (~142 occurrences): a short unbannered "*Holding message*" sent within minutes of first report, before facts are established. Often carries only a headline plus `Service groups affected` / `Stranded Trains` if known. Ends with "details being established and update to follow."
- **Initial alert**: the first structured message. Status emoji + `*Title*`, then structured sections (see §1.3).
- **Updates**: numbered (`*Update 1*`, `*Update 2*`, … — 393/279/191/111/75… occurrences of updates 1–5; a second convention zero-pads: `Incident Update 01`). Updates re-state the full section set on major incidents, or collapse to a two-line narrative on smaller ones.
- **Normal working resumed** (~620 mentions across both casings): the 🟢 message. `Normal working resumed at HH:MM` + cause found + any follow-up inspections + current DSF.
- **Service recovery** (~670 mentions): post-NWR message(s) driven by the ITSR huddle — recovery plan per operator, recovery target times, DSF, next review time.

Two message *registers* coexist:

- **Long-form** — full sectioned template (the shape the old tool generates). Used for genuinely significant incidents.
- **Short-form** — one emoji + `*Title*` + a 1–4 sentence narrative. This is the *majority* of update traffic; many incidents run entirely short-form, with detailed messaging handled through other channels.

**Design consequence**: the new section must make short-form as fast as long-form — the old tool only does long-form, which is a key reason it feels clunky.

### 1.2 Message anatomy

Every message follows the same skeleton:

```
{status emoji} *{Title}*

{*Update N*}          ← updates only

{narrative and/or structured sections}
```

- **Status emoji ladder** — used on ~1,500 messages: 🔴 (508) major/ongoing, 🟠 (234) significant, 🟡 (357) minor/monitoring, 🟢 (395) resolved/normal working. The emoji tracks *current state* and steps down over an incident's life (🔴 → 🔴 → 🟢, or 🟠 → 🟡 → 🟢). It is independent of the Red/Black *banner* severity.
- **Title** — `{What} {Where}`, set once at incident creation and repeated verbatim on every message: `*Car on the Line Orston*`, `*2 x TCF Market Harborough*`, `*TC622/633 SOWC, Route Locked. - Syston Curve*`. The old tool's guidance ("Type of failure – location – equipment where possible") matches the corpus.
- **DSF grammar** — `DSF 23 x 170` (trains × minutes), 280 occurrences, sometimes `DSF 134 X 1707`, occasionally with part/full cancellations appended. Rendered inline in Delay Status or NWR messages.

### 1.3 Section usage (corpus counts)

Bold section headers, counted across both channels (casing variants merged):

| Section | Count | Phase where used |
|---|---|---|
| `*Command Structure*` | 432 | Initial + full updates |
| `*Response*` / `*Response Deployed*` / `*Response and timescales*` | 529 | Initial + full updates |
| `*Stranded Trains*` | 227 | Initial + full updates |
| `*Headline*` | 225 | Initial |
| `*Immediate plan going forward*` | 128 | Service recovery |
| `*Service Group Recovery Target*` | 115 | Service recovery |
| `*Train Service*` / `*Effect on Train services*` / `*Train Plan*` | 176 | Updates |
| `*Service Groups affected*` (all casings) | 107 | Initial + full updates |
| `*Priority Plan*` / `*Prioritised plan*` | ~70 | Initial + updates |
| `*Milestone Plan*` (both casings) | 72 | Updates |
| `*Strategic priorities*` | 68 | Major incident updates |
| `*Post incident service recovery*` | 45 | Service recovery |
| `*Customer Impact*` / `*Customer Messaging*` | ~40 | Updates |
| `*Delay Status*` / `*Delay so far*` | 29 | Updates + NWR |
| `*Contingency Plan*` | 16 | Updates |

Command structure roles observed: `Rail Incident Commander` (RIC), `Tactical Incident Commander` (TIC), `RIO` (296), `TPIC` (488), `MMIC` (508), plus ad-hoc entries (S&T Fault Team, P-Way Fault Team, Ops support). Response resources: `MOM` (1,952), `BTP` (576), `S&T`, `P-Way`, `OLE` (253), `ERU`, Off Track, Telecoms — each with an `ETA HH:MM` that flips to `On site` once arrived (ETA appears 1,116 times).

### 1.4 What carries forward between messages

On the long-form incidents (e.g. *Car on the Line Orston*, updates 1–6), each update re-prints Title, Service groups, Stranded trains, Customer messaging, Response, Command structure — with only small deltas (an ETA becomes "On site", a stranded train is cleared, DSF ticks up). The operator is manually re-typing 80% of the previous message. **This is the single biggest speed win available**: persist the incident record, edit the delta, regenerate.

---

## 2. Review of the existing tool

Single-page static site (1.7 MB HTML, all inline JS + base64 banners). Tabs: Initial Incident message · Incident update · Normal working resumed · Service Recovery · Rail Incident Commander · Route Strategic Outputs.

**Worth keeping** (and reflected in this framework):
- The five-phase cycle matches the corpus exactly.
- Red/Black severity split with matching banner sets.
- Title auto-carry from initial → update → NWR → recovery.
- Response picklist (MOM/ERU/BTP/S&T/PWay/Off Track/OLE/Telecoms/Other) with optional ETAs.
- Strategic priorities as four selectable groups (responder / site / investigation / train service).
- The full banner set (§5).

**Why it's clunky/rigid**:
- Each tab is a flat one-shot form: no incident object, so updates don't know what the initial message said beyond the title. ETAs are re-typed; nothing steps down automatically.
- No short-form register at all — every output is the full template, so operators fall back to typing free-hand in WhatsApp for the majority of traffic.
- One incident at a time; starting a second incident wipes the first.
- No update numbering, no timeline of what has already been sent, no status emoji management.
- Sections cannot be added/removed per message — the template decides for you.
- No persistence: refresh loses everything.

---

## 3. Design principles for the new section

1. **Incident as a persistent object, not a form.** One `IncidentState` record holds identity (title, severity, route/off-route, service groups) and living state (status emoji, response roster, command structure, stranded trains, plans, DSF). Every phase's message is *rendered from the record*; the operator edits the delta, not the message.
2. **Two registers, one record.** Every phase can render **Full** (sectioned template + banner) or **Brief** (emoji + title + narrative, no banner). Default: Full for Initial/NWR/Recovery, Brief for updates — matching corpus behaviour.
3. **Sections are composable blocks.** The renderer walks an ordered block list; each block self-suppresses when empty (same pattern as the existing message builders). Per-phase defaults from §1.3, but any block can be toggled on/off per message.
4. **State steps forward automatically.** Sending a message advances the machine: update numbers auto-increment; resources with a reached ETA prompt "mark on site?"; choosing the NWR phase pre-fills `Normal working resumed at {now}` and flips status to 🟢; cleared stranded trains drop off with a "safely returned/moved" line available.
5. **Multiple concurrent incidents.** An incident list (localStorage, same pattern as `ma-session-v5`); each incident owns its own thread history. Closing an incident archives it.
6. **The timeline is visible.** A sent-message log per incident (phase, update number, timestamp, register, text as sent) so the operator can see at a glance what the channel has already been told — and re-copy any earlier message.

---

## 4. Lifecycle state machine

```
            ┌──────────┐   facts in    ┌─────────┐  send   ┌──────────┐
 create ──▶ │ HOLDING  │ ────────────▶ │ INITIAL │ ──────▶ │ UPDATING │ ◀─┐
            └──────────┘  (optional)   └─────────┘         └────┬─────┘   │ Update N+1
                 │                            ▲                 │─────────┘
                 └────── skip holding ────────┘                 │ lines handed back
                                                                ▼
                                  ┌────────┐  ITSR huddle  ┌────────────┐
                       archive ◀─ │ CLOSED │ ◀──────────── │ NWR / SVC  │
                                  └────────┘   (optional)  │  RECOVERY  │
                                                           └────────────┘
```

- Any state can emit a Brief update; phase transitions change the default template and banner.
- Escalation is allowed (an incident opened 🟡 Brief can be promoted to a full Red/Black incident without retyping — the record already exists).
- De-escalation to 🟢 without formal NWR/recovery (the common small-incident path: `🟢 *Title*` + one line + DSF) is a first-class exit.

## 5. Banner inventory (preserved from the existing system)

Extracted from the current tool and committed to `public/banners/incident/`. Served exactly like the existing daily-message banners (absolute URL via `NEXT_PUBLIC_APP_URL`, embedded in the Teams/rich clipboard flavour; WhatsApp gets plain text and the operator pastes the banner image where wanted — same dual-clipboard mechanism as `Composer`).

| File | Old-tool constant | Used for |
|---|---|---|
| `incident-red.png` | `BANNERS.Red` | Initial alert, Red severity |
| `incident-black.png` | `BANNERS.Black` | Initial alert, Black severity |
| `update-red.png` | `UPDATE_BANNER` | Incident update, Red |
| `update-black.png` | `UPDATE_BANNER_BLACK` | Incident update, Black |
| `normal-working-resumed.png` | `NWR_BANNER` | Normal working resumed |
| `service-recovery.png` | `SERVICE_RECOVERY_BANNER` | Service recovery |
| `major-incident-alert.png` | `OFF_ROUTE_BANNERS["Major Incident Alert"]` | Generic major-incident header |
| `off-route-kent.png` / `off-route-sussex.png` / `off-route-york.png` / `off-route-rugby.png` | `OFF_ROUTE_BANNERS.*` | Incidents on neighbouring routes affecting EM services |
| `rso-disruptive-weather.png` | `RSO_BANNER_WEATHER` | Route Strategic Outputs — disruptive weather |
| `rso-arrangements-conference.png` | `RSO_BANNER_CONFERENCE` (also `RSO_BANNER_DEFAULT`) | Route Strategic Outputs — arrangements conference / output |

Banner selection is automatic from `(phase, severity, offRoute)` with a manual override dropdown. Brief-register messages carry no banner by default.

## 6. Output contract per phase

The renderer produces plain text (WhatsApp) plus the Teams HTML flavour, exactly as the existing builders do. `{…}` = field, `[…]` = block that self-suppresses when empty.

### 6.1 Holding

```
*Holding Message*

{narrative — what's been reported, by whom}

[*Service groups affected*\n{list}]
[*Stranded Trains*\n{list or "None"}]

Details being established and update to follow.
```

### 6.2 Initial alert (Full)

```
{emoji} *{Title}*

*Headline*
{what happened, reported by whom, when, effect on the railway}

[*Service Groups affected*\n{selected groups}]
[*Stranded Trains*\n{per-train: headcode, location, plan} | "None"]
[*Train Service*\n{how services are running}]
[*Customer Impact*\n{CSL level, ticket acceptance, road transport}]
*Response*
{per resource: name, "ETA HH:MM" | "On site"}
*Command Structure*
{per role: role label, holder}
[*Prioritised Plan*\n{numbered/lined priorities}]
[*Milestone Plan*\n{milestones or "To be established…"}]
```

### 6.3 Update (Full)

Same block set as Initial, headed by `*Update {N}*` under the title, with `*Delay Status*` (DSF + cancellations) and `*Strategic priorities*` available. Brief register:

```
{emoji} *{Title}*

*Update {N}*: {narrative}
```

### 6.4 Normal working resumed

```
🟢 *{Title}*

[*Update {N}*]
Normal working resumed at {HH:MM}. {cause found / handback detail / follow-up inspections}

[Contingency plan withdrawn.]
[*Delay Status*\nDSF {trains} x {minutes}[ with {n} part/full cancellations]]
[Post incident service recovery update to follow post ITSR huddle.]
```

### 6.5 Service recovery

```
🟢 *{Title}* – *Service Recovery*

[DSF {trains} x {minutes}]
*Immediate plan going forward*
{narrative}
*Service Group Recovery Target*
{per operator/service group: target time or "train by train" note}
[*Post incident service recovery*\n{stock/crew displacement consequences, next-day impact}]
[Time of next service recovery review: {HH:MM}]
[{additional note}]
```

## 7. Data model

New slice `incident` alongside the existing session slices; incidents list persisted under its own key (`ma-incidents-v1`) so daily-message state is untouched.

```ts
export type IncidentPhase = "holding" | "initial" | "update" | "nwr" | "recovery" | "closed";
export type IncidentSeverity = "red" | "black";
export type StatusEmoji = "red" | "orange" | "yellow" | "green"; // 🔴🟠🟡🟢
export type MessageRegister = "full" | "brief";

export interface ResponseResource {
  kind: "MOM" | "ERU" | "BTP" | "S&T" | "PWay" | "OffTrack" | "OLE" | "Telecoms" | "Other";
  label: string;          // "Nottingham MOM", "Richmond recovery"
  eta: string;            // "19:30" — empty when unknown
  onSite: boolean;
  onSiteAt?: string;
}

export interface CommandRole {
  role: string;           // "Rail Incident Commander", "TPIC", "RIO", custom
  holder: string;         // "SNDM Derby", "Nathan Kent"
  mandatory: boolean;     // RIC + TIC per old tool
}

export interface StrandedTrain {
  headcode: string;
  location: string;
  plan: string;           // "Will be moved when possible" / "safely returned to Nottingham"
  cleared: boolean;
}

export interface SentMessage {
  ts: number;
  phase: IncidentPhase;
  updateNo: number | null;
  register: MessageRegister;
  banner: string | null;  // banner file used, if any
  text: string;           // as sent — the immutable log
}

export interface IncidentState {
  id: string;
  createdAt: number;
  phase: IncidentPhase;
  severity: IncidentSeverity;
  status: StatusEmoji;
  offRoute: null | "kent" | "sussex" | "york" | "rugby";
  title: string;                    // "{What} {Where}", fixed at creation
  serviceGroups: string[];          // picklist + free text
  headline: string;
  trainService: string;
  customerImpact: string;
  stranded: StrandedTrain[];
  response: ResponseResource[];
  command: CommandRole[];
  priorityPlan: string;
  milestonePlan: string;
  strategicPriorities: string[];    // selected from the four fixed groups
  dsf: { trains: string; minutes: string; cancellations: string };
  nwr: { time: string; detail: string; contingencyWithdrawn: boolean; recoveryToFollow: boolean };
  recovery: { immediatePlan: string; targets: string; postIncident: string; nextReview: string; note: string };
  updateCount: number;              // last sent update number
  draftNarrative: string;           // the per-message delta (Brief body / Full update narrative)
  sent: SentMessage[];
}
```

Rendering: pure builders in `src/lib/incident/` (`buildHolding.ts`, `buildInitial.ts`, `buildUpdate.ts`, `buildNWR.ts`, `buildRecovery.ts` + `render.ts` shared block walker), mirroring `src/lib/messageBuilders/` and unit-tested like `src/lib/safety/renderer.ts`.

## 8. UI flow

New tab `incident` in the existing tab bar (`TabKey` + `VISIBLE_TABS`), reusing Card / AutoTextarea / StatusSelect / EmojiTray / Composer conventions.

1. **Incident rail** (top of tab): chips for each open incident + "New incident". Selecting a chip loads its record; incidents are fully independent.
2. **New incident** = one compact row: title (with `What – Where` hint), severity (Red/Black), status emoji, on/off-route, service-group picklist. Everything else optional — operator can send a Holding message ~15 seconds after creation.
3. **Phase stepper**: Holding → Initial → Update → NWR → Recovery, with the current phase highlighted and reachable phases clickable (the state machine in §4 gates transitions; anything can be revisited to re-send).
4. **Block editor**: the phase's default blocks in output order; each block collapsible, removable, or addable from the catalogue. Sticky fields (response, command, stranded, service groups) are edited in place and persist across phases.
5. **Preview + copy**: live preview with banner thumbnail (as `BannerPreview` today), `Copy text` / `Copy with banner` via the existing dual-format clipboard, and a Register toggle (Full/Brief). Copying appends to `sent[]`, bumps `updateCount` when in update phase, and triggers the step-forward prompts (§3.4).
6. **Timeline drawer**: the `sent[]` log, newest first, one-click re-copy.

## 9. Intelligence features (the "quicker" part)

- **Delta editing**: updates open with the previous full message's state; only the narrative field starts empty.
- **ETA awareness**: any resource whose ETA has passed shows a one-click "On site" chip; renderer swaps `ETA 19:30` → `On site`.
- **Auto-numbering & timestamps**: `*Update N*` derived from `updateCount`; NWR time pre-filled with now (Europe/London), editable, normalised `XXXX → XX:XX` as in the old tool.
- **Status ladder nudges**: entering NWR phase suggests 🟢; escalating severity to Black suggests 🔴 and swaps banners.
- **DSF prompt cadence**: if the last sent full update carried no DSF and one was previously reported, surface a reminder chip.
- **Stranded-train resolution lines**: marking a train cleared offers `{headcode} safely returned to {location}` into the narrative.
- **Strategic priorities**: the old tool's four groups (Responder / Site / Investigation & Recovery / Train services) as tick-to-include boilerplate, editable after insertion.

## 10. Phasing

- **Phase 1 (this framework)**: incident object + lifecycle + Full/Brief renderers + banners + timeline; localStorage only. Route Strategic Outputs (weather/conference) stays on the old tool.
- **Phase 2**: Route Strategic Outputs rebuilt as a sibling sub-tab (its two banners are already committed); optional Supabase table (`ma_incidents`) for cross-device continuity and post-incident review; snapshot capture of sent incident messages alongside the existing `ma_message_snapshots`.

## Open questions

1. Service-group picklist: the old tool's list (Derby/Nottingham/Leicester, Lincoln/Sleaford/Skegness, Bedford South, …) needs validating against current service-group definitions before hard-coding.
2. Should Brief updates auto-suppress all structured blocks (corpus says yes), or keep DSF visible?
3. Do NWR + Service Recovery ever need Black-severity banner variants (the old tool has none — NWR/recovery banners are severity-agnostic)?
4. Retention: how long should closed incidents stay in the archive list before pruning localStorage?
