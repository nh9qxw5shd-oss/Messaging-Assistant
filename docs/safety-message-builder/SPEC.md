# Safety Message Builder — Restructure Prompt (v2)

**Purpose**: Rebuild the safety message builder so a Control operator produces a fully-formatted EM Route safety alert in under 60 seconds — output indistinguishable in voice from the established pre-2026 corpus, but with format inconsistencies eliminated and field-level structure enforced underneath.

**Empirical basis**: 1,280 historical EM Route safety alerts (Aug 2020 – Apr 2026). Where v1 imposed an explicit ABCD scaffold, v2 reproduces the natural prose rhythm the corpus already converged on, and shifts standardisation from the rendered output to the data layer beneath it. The user sees prose; the builder enforces the beats.

---

## 1. Output contract — the canonical message format

Every message rendered by the builder must conform to the following template. Field order is exact. The user **never types a literal asterisk, emoji, or beat label** — those are produced by the renderer.

### 1.1 Header

Two variants. The builder picks based on category + severity flags (see §1.3); the user can override.

**Plain header** (default — ~75% of historical messages):
```
⚠️ *East Midlands Route - Advice of {category}{ - {sub_category}}*
```

**Identified header** (~25% — used for severity-flagged incidents):
```
⚠️ *East Midlands Route - {category_short_form} {headcode}{ {location_short}}*
```

Examples of each:
- `⚠️ *East Midlands Route - Advice of Wrong route - Not Taken*`
- `⚠️ *East Midlands Route - Advice of Staff Accident*`
- `⚠️ *East Midlands Route - Advice of Near Miss*`
- `⚠️ *East Midlands Route - Cat A SPaD 1D48 St Pancras Churchyard*`
- `⚠️ *East Midlands Route - 1N07 Near Miss Calverleigh Farm UWC*`
- `⚠️ *East Midlands Route - Possession Irregularity / Ampthill*`

For autumn-related WSTCF, append 🍂: `⚠️🍂*East Midlands Route - Autumn Related WSTCF*`. For status updates that are de-escalations or routine progress reports (not new incidents), the renderer substitutes ℹ️ for ⚠️.

### 1.2 Body — the four beats

The body is a single flowing block of prose. No section labels. No bullets unless the message contains genuinely parallel multiple incidents (see §1.4). Beats are separated by sentence boundaries, not headers.

```
[Beat 1 — Source & headline]
[Beat 2 — Mechanism]
[Beat 3 — People status]
[Beat 4 — Actions & handovers]
```

Each beat is described in detail in §1.5. Visually the message reads as 3–6 sentences of operational prose, e.g.:

> ⚠️ *East Midlands Route - Advice of Wrong route - Not Taken*
> EMCC SSM advises 1Y13 (10:09 LEEDS to NOTTINGHM) was wrong routed at signal DC4878 towards Derby vice Alfreton. Driver queried the route and signal taken back. Driver OK to continue. SSM will advise LOM.

The builder produces this from structured field input — the user does not write prose freehand.

### 1.3 Severity triggers for "Identified header"

Promote headcode + location into the header when **any** of the following apply:
- Category is `SPAD` (Cat A or Cat B)
- Category is `Near Miss` and sub-category is `Member of Public`, `Trespasser`, or `Staff`
- Category is `Staff accident` and IP has attended A&E or hospital
- Category is `Possession irregularity`, `Line block irregularity`, or `Despatch irregularity` with an identifiable location anchor
- Category is `Fire`, `Trespass`, or `Fatality` (always)
- Manual override by user (a single toggle in the UI)

Otherwise, default to the plain header.

### 1.4 Multi-incident messages

When two or more incidents are bundled (~22 historical examples — typically end-of-shift digests or clusters within a short window), use:

```
⚠️ *East Midlands Route - Advice of safety incidents*

1. {body for incident 1, four beats}

2. {body for incident 2, four beats}
```

Sub-headers per incident (e.g. `*WSF NN4029BR/Sunlight washout*`) are permitted if the incidents are heterogeneous.

### 1.5 Beat-by-beat specification

This is the spec the renderer follows. Each beat is built from structured fields collected by the builder.

**Beat 1 — Source & headline (mandatory, 1 sentence)**
- Form: `{Reporter} {verb} {subject_phrase} at {location}.`
- `Reporter` from picklist (§3): `EMCC SSM`, `WH SSM`, `Signaller {location}`, `Driver`, `EMR`, `MOM {area}`, `TSE`, `LOM`, `NOC`, `BTP`, etc.
- `Verb`: `advises` (default for SSM/Signaller/MOM/TSE/LOM/EMCC/EMR/NOC reporting on someone else's incident); `reports` (default when the reporter is the driver or IP themselves); `has advised of` / `has reported` (acceptable variants).
- `Subject phrase` is category-specific — see §1.6.
- Trailing comma/period before the location is renderer's choice; aim for natural reading.

Examples (real, from corpus):
> EMCC SSM advises wrong route offered to 6H03 on the Dn Fast at Syston South Jn.
> Signaller Scropton advises near miss reported by driver 1K59 when approaching Mill Lane UWC.
> Driver 1D48 reports passing WH21 by one coach length.

**Beat 2 — Mechanism (mandatory, 1–3 sentences)**
- The factual technical detail. Signal IDs (`WH273`, `LR455`, `DC4878`), routes offered vs booked (`towards X vice Y`), speeds (`90mph at TPWS+ OSS set 65mph`), TC IDs (`T/C 2014 SCWO`), times (`HH:MM hrs`), service descriptors (`170416`).
- No editorialising. No conjecture beyond `cause not yet known` / `believed to be` if genuinely uncertain.
- Acronyms used freely without expansion.

**Beat 3 — People status (mandatory if any human is involved, 1 sentence, can be folded into Beat 2 or 4 if natural)**
- Standard phrasings (use one): `Driver OK to continue` / `Driver fit to continue` / `Driver okay` / `Driver stood down for D&A` / `Driver relieved at {location}` / `IP attending hospital` / `IP first aid given` / `Signaller relieved` / `No injuries`.
- For staff accidents with ongoing care: include severity, response (`PRICE protocol observed`), and whether absence is expected.

**Beat 4 — Actions & handovers (mandatory, 1–4 short sentences or one comma-spliced sentence)**
- The list of who's been told, what's en route, what's been requested, and what investigation level is in play.
- Render as natural sentences — not bullets — unless §1.4 multi-incident format is in use.
- Standard phrasings (the chip set, see §4) are inserted verbatim.
- Closing token if delay quoted: `OTM HH:MM hrs {N}L` or `Nil delay` / `Sub-threshold`.

### 1.6 Category-specific subject phrases for Beat 1

The renderer uses these to construct the headline naturally. The `[ ]` portions are filled from the builder's structured fields.

| Category | Subject phrase template |
|---|---|
| Wrong route — Not taken | `wrong route offered to [headcode] at [location]` |
| Wrong route — Taken | `[headcode] wrongly routed at [location]` |
| Wrong route — Offered & not taken | `[headcode] offered wrong route at [location]` |
| SPAD — Cat A | `Cat A SPAD [headcode] at [signal] [location]` |
| SPAD — Cat B | `Cat B SPAD [headcode] at [signal] [location]` |
| Near miss — MOP/Trespasser | `near miss reported by driver [headcode] at [location]` |
| Near miss — Staff | `near miss involving [staff role] at [location]` |
| Near miss — Vehicle at LC | `near miss with [vehicle type] at [crossing]` |
| Staff accident | `[IP role] has [injury verb phrase] at [location]` (no "advises") |
| Staff accident — late report | `late reported staff accident — [IP role] at [location]` |
| WSTCF (autumn) | `Autumn related WSTCF at [location] T/C [TC ID]` |
| WSTCF (non-autumn) | `WSTCF reported by [signaller] of [TC ID] at [location]` |
| TPWS activation | `[headcode] TPWS activation at [signal] [location]` |
| COA | `[headcode] COA at [signal] [location]` |
| Station overshoot | `[headcode] overshot [station] by [distance]` |
| Possession irregularity | `possession irregularity in [item] at [location]` |
| Line block irregularity | `line block irregularity at [location]` |
| Trespass | `trespass at [location]` |
| Level crossing — Misuse | `[crossing type] misuse at [crossing name]` |
| Level crossing — Strike | `[vehicle type] strike at [crossing name]` |
| Despatch irregularity | `[headcode] despatch irregularity at [location]` |
| Fire | `fire — [type] at [location]` |
| Fail to call | `[headcode] failed to call at [station]` |

For categories not listed: `Reporter advises [free-text headline] at [location].`

---

## 2. Incident category picklist (closed list)

The builder must present these as the primary selector. Frequencies in parentheses indicate UI ordering.

| Category | Sub-category options |
|---|---|
| **Wrong route** (251) | Not taken / Taken / Offered – not taken / Offered – taken |
| **Staff accident / injury** (227) | Strain or sprain / Cut or laceration / Trip or slip / Struck by / Insect bite or sting / Illness / Other |
| **Near miss** (155) | Member of public / Trespasser / Staff / Vehicle at LC / Animal |
| **COA / SPaR / Signalling irregularity** (138) | COA – signaller error / COA – ARS / SPaR / Irregular signal sequence / WSF |
| **Level crossing incident** (126) | Misuse / Strike / Barrier failure / Wicket gate damage / Vehicle through barrier |
| **SPAD** (119) | Cat A / Cat B / TPWS-only / Multi-SPAD |
| **Autumn-related WSTCF** (114) | SCWO / Centrix alarm / Late notice |
| **WSTCF (non-autumn)** (95) | TC failure / WSF / Wheel contamination |
| **Line block irregularity** (59) | Limit error / Granted without protection / Late hand-back / Overlapping LBs |
| **Station overshoot** (40) | Station passed / Reportable railhead / Lapse of concentration / Other |
| **Possession irregularity** (33) | Worksite outside limits / Marker board error / Picop or ES error / Strike with marker |
| **TPWS activation** (32) | OSS / TSS / Loop / Unsolicited |
| **Trespass** (18) | On track / On platform / Crossing barriers |
| **Fire** | On train / Lineside / Equipment |
| **Fail to call** | Booked station passed |
| **Despatch irregularity** | Tip not taken / At red |
| **Other operating irregularity** | Free text |

---

## 3. Field-level data collection

Validation enforced at entry. Invalid data must never reach a posted message.

| Field | Required? | Validation / source |
|---|---|---|
| Report datetime | Yes | Auto-`now()`; user-editable. Posted in chat by message timestamp — no need to render in body. |
| Category | Yes | Picklist (§2). |
| Sub-category | If category has them | Picklist; "Other" allows free text. |
| Reporter / source | Yes | Picklist: `EMCC SSM` / `WH SSM` / `TBROC SSM` / `Signaller [loc]` / `Driver` / `EMR` / `MOM [area]` / `TSE` / `LOM` / `NOC` / `BTP` / `Other`. |
| Reporter location qualifier | Conditional | Required when reporter is `Signaller` or `MOM`. Free text. |
| Headcode | Optional (mostly used) | Regex `^\d[A-Z]\d{2}$`. |
| Service origin → destination | Optional | Free text, paired with headcode. |
| Headcode unit / set number | Optional | Integer or alphanumeric (e.g. `170416`, `158847`). |
| Location | Yes | Free text with typeahead from prior 30 days within same category. |
| Signal ID(s) | Optional | Regex `^[A-Z]{1,3}\d{1,5}$`. Allow multiple. |
| TC ID | Optional | For WSTCF/COA categories. Free text. |
| Routing detail (for Wrong Route) | Conditional | `Offered: [signal] [line] → [signal] [line]; Booked: [signal] [line] → [signal] [line]` — auto-formatted into `towards X vice Y`. |
| Speed (for SPAD/TPWS) | Optional | Integer in mph, paired with PSR/OSS set point. |
| Time of incident | Optional | `HH:MM` 24h. Used in Beat 1 if <2 hours old. |
| People involved | Conditional | Multi-select chips: Driver / Signaller / Sig (trainee) / SSM / MOM / IP / Member of Public / Trespasser / Picop / ES / COSS / Contractor / Other. |
| IP role + injury (staff accident) | Required for category | `IP role` (free text or picklist of common roles), `Injury verb phrase` (free text — e.g. "injured their lower back pulling a lever"). |
| Driver welfare | Conditional | Picklist: `OK to continue` / `Fit to continue` / `Stood down for D&A` / `Relieved at [loc]` / `Stood down (other)` / `Not yet known`. |
| Mechanism / detail (Beat 2) | Yes | Free text. Char count visible. Hint text reminds the user to include signal IDs, speeds, sequence, technical cause. |
| Action chips (Beat 4) | Yes — at least one | Multi-select with optional inline params (BTP ref number, A&E hospital name, etc.). See §4. |
| Delay outcome | Optional | Picklist: `OTM [time] [N]L` / `Nil delay` / `Sub-threshold` / `Service terminated` / `ECS to [loc]`. |
| Severity flag | Auto | Set by category + sub-category combinations per §1.3. User can override. |
| Status type | Yes | Picklist: `New` / `Update` / `6 Hour update` / `Closed`. New is default. |

---

## 4. Standard "Actions & handovers" chips (Beat 4)

Selecting a chip inserts a canonical phrase. Chips with a `___` accept inline input. Order in the rendered output follows the order of selection — drag-to-reorder supported.

```
- BTP advised (Ref: ___)
- BTP attending
- MOM attending
- MOM en route
- S&T attending / on call
- L2 / L3 S&T advised
- Care plan in place / care plan owner appointed
- First aid given
- IP accompanied to A&E (___)
- IP / driver stood down
- Driver relieved at ___
- Cause screening (D&A) arranged
- 3.5 working introduced / Double blocking implemented
- Caution imposed at ___
- OTDR / OTMR download requested
- FFCCTV requested
- Statements taken
- Service set back / forward as ECS to ___
- LOM aware / LOM advised / will advise LOM
- Line manager advised
- L1 / L2 / L3 investigation
- TSR imposed
- No allegations against infrastructure / equipment
- Train terminated
- Driver OK to continue / Driver fit to continue
- BTP Ref: ___
- NIR raised (___)
- Close Call raised (Ref: ___)
```

The renderer composes these into prose. Examples of how chips become natural sentences:

- Chips: `BTP advised (198)`, `MOM attending`, `FFCCTV requested`
  → `BTP advised Ref: 198. MOM attending. FFCCTV requested.`

- Chips: `IP accompanied to A&E (Barnet General)`, `Care plan in place`
  → `IP accompanied to A&E at Barnet General. Care plan in place.`

- Chips: `Driver stood down`, `Cause screening (D&A) arranged`, `OTDR download requested`
  → `Driver stood down. Cause screening arranged. OTDR download requested.`

---

## 5. Voice and register rules (renderer-enforced where automatable, user-hinted otherwise)

These reproduce the pre-2026 corpus voice exactly. Most are enforced by the renderer because the user fills structured fields rather than writing prose.

1. **Third person, past tense.** Driver-reported events use `reports`; everything else uses `advises`.
2. **No editorialising.** No "thankfully", "fortunately", "concerning", "alarming". Hint shown if free-text fields contain these tokens.
3. **Acronyms unexpanded.** Permitted without gloss: LOM, SSM, MOM, EMCC, WSTCF, SCWO, TPWS, OSS, TSS, COA, SPaR, SPAD, IIRCM, GZAC, COSS, ES, Picop, IP, RHTT, ROLA, FFCCTV, OTDR, OTMR, NIR, TBROC, DRM, ARS, NWR, FPC, UWC, MCG, AHB, AHBC, MCB, CCTV LC, BTP, TSE, OTM, PSR, RT3185, T3, ECS, MOP.
4. **No conjecture.** "Cause not yet known" / "investigation ongoing" — never speculate.
5. **No first names of staff** unless the staff member is a named contact for follow-up (e.g. care plan owner, IIO, named TES/Picop).
6. **Standard phrasings preferred over equivalents** — e.g. always `Driver OK to continue` (not "the driver is fine"), always `MOM attending` (not "MOM is on the way"), always `BTP advised Ref: X` (not "we informed BTP, reference number X").
7. **Numbers and units**: `90mph` not `90 mph`; `100yds` / `100ft` / `12mtrs` (mixed in corpus — accept all, normalise to most common per category); `2 coach lengths` not `two coach lengths`.
8. **Times**: `HH:MM hrs` (e.g. `13:03 hrs`) when stating a specific time; `HHMM` acceptable in retrospect.

---

## 6. Functional requirements for the builder UI

### 6.1 Flow
Single-screen form. No wizard. Fields grouped left-to-right or top-to-bottom by beat (visually corresponding to where they appear in the rendered prose). Live preview updates as the user types — preview pane shows the rendered message in monospace, exactly as it will post.

### 6.2 Smart defaults
- **Category-driven field visibility**: fields irrelevant to the chosen category are hidden. Wrong route exposes routing detail; SPAD exposes signal + speed; staff accident exposes IP role + injury phrase; WSTCF exposes TC ID + SCWO duration.
- **Reporter inference**: if the user picks `Signaller` and the location field is filled, the reporter qualifier auto-populates.
- **Headcode → service lookup**: if integrated with a service planner, a valid headcode auto-populates origin–destination and unit number.
- **Location memory**: typeahead from prior 30 days within the same category.
- **Beat 1 auto-build**: as soon as Reporter + Category + Headcode + Location are populated, the rendered Beat 1 sentence appears in the preview. The user does not write Beat 1 freehand.

### 6.3 Output
- **Copy to clipboard** is the primary action.
- **Post to WhatsApp / Teams / email** as secondary if integrations exist.
- **Save as draft** required (Control operators are interrupted constantly).
- **Edit before post**: the rendered prose is editable in a final-review textbox. Any edit is preserved verbatim — the renderer does not re-process after manual edit.

### 6.4 Update / follow-up flow
For Status = `Update` or `6 Hour update`, the builder lets the user select a parent message (last 7 days, filtered by category + location) and prefills the form. Output renders with `*Update*` prefix line and uses ℹ️ for de-escalations.

### 6.5 Multi-incident batch
For end-of-shift "State of the Route" digests, allow stacking N incidents under a single header per §1.4.

---

## 7. Acceptance criteria

The rebuild is done when:

1. A typical Wrong Route – Not Taken alert is produced from a blank form in **≤60 seconds** by an operator who has used the tool once.
2. A Cat A SPAD alert is produced in **≤120 seconds** including all required mitigation chips.
3. **Zero free-text formatting** is required of the user — no asterisks, emojis, or beat names typed manually.
4. Output passes a regex-based linter that checks: header format matches §1.1, body contains all four beats in correct order (validated by presence of reporter verb, location, action chip phrases), driver welfare token present where category implies a driver, no banned editorialising tokens (§5.2).
5. **30 random historical messages** can be reproduced from structured field input with zero information loss and a Control operator cannot reliably distinguish renderer output from the historical messages in a blind test.
6. Casing inconsistency (`Safety Incident` / `safety incident` / `SAFETY INCIDENT`) is eliminated — exactly one canonical form per category is rendered.

---

## 8. Out of scope

- Message routing / distribution (this is the builder, not the dispatcher).
- Auto-classification of inbound free-text reports into the category schema.
- Cross-Route formatting — EM Route only for v1.

---

## 9. Reference: target output examples

These are the format v2 should produce. They reproduce real historical messages from the corpus — none are invented.

**Wrong Route — Not Taken**
> ⚠️ *East Midlands Route - Advice of Wrong route - Not Taken*
> EMCC SSM advises 1Y13 (10:09 LEEDS to NOTTINGHM) was wrong routed at signal DC4878 towards Derby vice Alfreton. Driver queried the route and signal taken back. Driver OK to continue.

**Cat A SPAD (identified header)**
> ⚠️ *East Midlands Route - Cat A SPaD 1D48 St Pancras Churchyard*
> Driver 1D48 reports passing WH21 (Down fast, St Pancras Churchyard) by one coach length. Signal was about to be cleared but signaller was busy with LB on Tottenham lines. Driver left St Pancras on a double yellow but became preoccupied with running brake test and missed the single yellow in rear of WH21. No allegation against signalling. Train forward to West Hampstead for relief.

**Staff accident (no "advises" verb — direct subject)**
> ⚠️ *East Midlands Route - Advice of Staff Accident*
> IP — Foley Signaller has injured their lower back pulling a lever from the frame. IP has significantly reduced mobility and will seek medical attention. Stoke MOM currently with the IP and Derby MOM en route. PRICE protocol observed (no cold compress available on location). Absence of up to 7 days currently expected. Care plan owner appointed.

**Near Miss with MOP at UWC (identified header)**
> ⚠️ *East Midlands Route - 1K59 Near Miss Mill Lane UWC*
> Signaller Scropton advises near miss reported by driver 1K59 when approaching Mill Lane UWC. Male MOP stepped out onto UWC and had to run clear after noticing service. Driver did not clarify if emergency brake application made. Driver confirmed MOP clear of the railway so NWR to be retained. BTP advised Ref: 198. EMR aware and will try to gather FFCCTV from unit. DY MOM requested to attend location and check signage and visibility.

**Autumn-related WSTCF (🍂 marker)**
> ⚠️🍂 *East Midlands Route - Autumn Related WSTCF*
> Derby TSE noted CENTRIX alarm on 2723 T/C SCWO with passage of 2L50 at Thorpe on the Hill on the Up Newark. Abnormal track circuit current detected; rise time exceeded 1905ms threshold. LOM advised and double block working implemented with data being reviewed by on-call L2 LN S&T.

**TPWS activation**
> ⚠️ *East Midlands Route - Advice of safety incident*
> EMCC SSM advises 1F07 has experienced an OSS TPWS activation in the area of LR321 signal Knighton Junction. 1F07 was temporarily held Leicester Stn awaiting EMR authority to proceed. Driver reports doing approx. 90mph at time of activation. 90.5mph PSR located 98m 26ch on the Dn Fast is the most likely current suspect although driver advises he may have missed AWS acknowledgment. EMR to review OTDR data to ascertain reason for brake demand.

**Update message (ℹ️ marker)**
> ℹ️ *East Midlands Route - Staff Accident Update*
> IP — Foley Signaller lower back injury has attended hospital and reports a lower back strain. As a result the IP has been advised to rest and recover between 5 and 7 days. Line Manager / care plan owner aware.

**Multi-incident**
> ⚠️ *East Midlands Route - Advice of safety incidents*
>
> 1. EMR 1Y10 TPWS activation in Belsize tunnel at TPWS+ OSS for WH14 signal. Driver did not report as TPWS and just an unsolicited brake application on approach to WH184 which was at yellow; subsequent OTDR download showed TPWS activated at 68mph (OSS+ set at 65mph). Driver stood down.
>
> 2. 4L13 COA / SPaR at WE5 signal Whissendine due to signaller error — trainee replaced signal to danger in error. LOM aware.

---

## 10. Implementation note for the agent rebuilding this

§1 (output contract), §2 (categories), §3 (fields), §4 (action chips), and §5 (voice rules) are **closed schemas** derived from the operational corpus — do not expand without consulting a Control operator. §6 (UI) is where you have design latitude.

The mental model: **the user fills in a structured form; the renderer composes prose**. The user should never type a sentence that gets posted verbatim — every sentence in the output is templated from structured input. The exception is the free-text Mechanism field (Beat 2) and the Injury phrase for staff accidents, which are user-authored prose because their content is genuinely incident-specific.

When in doubt, ask: *would the rendered output look out of place if dropped between two real messages from 2023?* If yes, the renderer is wrong, not the corpus.
