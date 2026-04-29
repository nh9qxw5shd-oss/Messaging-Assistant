"use client";
import { useMemo, useCallback } from "react";
import { useStore } from "@/lib/store";
import { renderSafetyMessage, lintMessage } from "@/lib/safety/renderer";
import {
  INCIDENT_CATEGORIES,
  REPORTERS,
  REPORTERS_NEEDING_QUALIFIER,
  ACTION_CHIPS,
  DRIVER_WELFARE_OPTIONS,
  DELAY_OUTCOMES,
} from "@/lib/safety/constants";
import type { SelectedChip } from "@/lib/safety/types";
import clsx from "clsx";

// ─── Shared style tokens ──────────────────────────────────────────────────────

const lbl = "block font-mono uppercase tracking-widest text-muted mb-1.5";
const inp =
  "w-full rounded bg-panel2 border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors placeholder:text-muted/60";
const sel =
  "w-full rounded bg-panel2 border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors cursor-pointer";
const row = "grid gap-2";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="font-mono uppercase tracking-widest text-muted/60 text-xs border-b border-grid/40 pb-1">
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {children}
    </div>
  );
}

// ─── Chip toggle button ───────────────────────────────────────────────────────

function ChipButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "px-3 py-1.5 rounded text-sm border transition-colors text-left",
        selected
          ? "bg-accent/15 border-accent text-accent"
          : "bg-panel2 border-grid text-muted hover:border-accent/50 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SafetyTab() {
  const { safety_msg: sf, setSafety, clearSafety, showToast } = useStore();

  // Helpers
  const update = useCallback(
    (partial: Partial<typeof sf>) => setSafety(partial),
    [setSafety]
  );

  // Derived
  const catDef = useMemo(
    () => INCIDENT_CATEGORIES.find((c) => c.id === sf.category),
    [sf.category]
  );
  const subcats = catDef?.subcategories ?? [];

  function handleCategoryChange(catId: string) {
    const def = INCIDENT_CATEGORIES.find((c) => c.id === catId);
    update({
      category: catId as typeof sf.category,
      subCategory: def?.subcategories[0]?.id ?? "",
    });
  }

  // Category-driven field visibility
  const showHeadcode = ![
    "staff_accident", "wstcf_autumn", "wstcf_non_autumn", "trespass",
    "fire", "other",
  ].includes(sf.category);

  const showSignal = [
    "wrong_route", "spad", "tpws_activation", "coa_spar_sig_irreg",
    "line_block_irreg", "possession_irreg",
  ].includes(sf.category);

  const showRouting = sf.category === "wrong_route";
  const showSpeed = ["spad", "tpws_activation"].includes(sf.category);
  const showTcId = ["wstcf_autumn", "wstcf_non_autumn", "coa_spar_sig_irreg"].includes(sf.category);
  const showStaffAccident = sf.category === "staff_accident";
  const showDriverWelfare = [
    "wrong_route", "spad", "near_miss", "tpws_activation",
    "station_overshoot", "despatch_irreg", "fail_to_call", "coa_spar_sig_irreg",
  ].includes(sf.category);
  const showLocationShort = catDef?.alwaysIdentified || sf.category === "near_miss" || sf.category === "possession_irreg";

  // Action chip management
  function isChipSelected(chipId: string) {
    return sf.actionChips.some((c) => c.chipId === chipId);
  }

  function toggleChip(chipId: string) {
    if (isChipSelected(chipId)) {
      update({ actionChips: sf.actionChips.filter((c) => c.chipId !== chipId) });
    } else {
      update({ actionChips: [...sf.actionChips, { chipId, param: "" }] });
    }
  }

  function setChipParam(chipId: string, param: string) {
    update({
      actionChips: sf.actionChips.map((c) =>
        c.chipId === chipId ? { ...c, param } : c
      ),
    });
  }

  // Live rendered output
  const rendered = useMemo(() => renderSafetyMessage(sf), [sf]);
  const lint = useMemo(() => lintMessage(rendered, sf), [rendered, sf]);

  function copyToClipboard() {
    navigator.clipboard.writeText(rendered).then(
      () => showToast("Copied to clipboard"),
      () => showToast("Copy failed")
    );
  }

  return (
    <div className="flex gap-4 min-h-0" style={{ minHeight: "calc(100vh - 130px)" }}>
      {/* ── Left: form ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 w-[420px] flex-shrink-0 overflow-y-auto pr-1">

        {/* Status type */}
        <Section title="Status">
          <div className={`${row} grid-cols-4`}>
            {(["new", "update", "6hour", "closed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => update({ statusType: s })}
                className={clsx(
                  "py-2 rounded text-sm font-mono border transition-colors",
                  sf.statusType === s
                    ? "bg-accent/15 border-accent text-accent"
                    : "bg-panel2 border-grid text-muted hover:text-ink"
                )}
              >
                {s === "6hour" ? "6hr upd." : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </Section>

        {/* Beat 1 — Source & headline */}
        <Section title="Beat 1 — Source & headline">
          <div className={`${row} grid-cols-2`}>
            <Field label="Reporter">
              <select
                value={sf.reporterType}
                onChange={(e) => update({ reporterType: e.target.value })}
                className={sel}
              >
                {REPORTERS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
            {REPORTERS_NEEDING_QUALIFIER.includes(sf.reporterType) && (
              <Field label="Reporter location">
                <input
                  type="text"
                  value={sf.reporterQualifier}
                  onChange={(e) => update({ reporterQualifier: e.target.value })}
                  placeholder="e.g. Scropton / Derby"
                  className={inp}
                />
              </Field>
            )}
          </div>

          <div className={`${row} grid-cols-2`}>
            <Field label="Category">
              <select
                value={sf.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={sel}
              >
                {INCIDENT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>
            {subcats.length > 1 && (
              <Field label="Sub-category">
                <select
                  value={sf.subCategory}
                  onChange={(e) => update({ subCategory: e.target.value })}
                  className={sel}
                >
                  {subcats.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {showHeadcode && (
            <div className={`${row} grid-cols-3`}>
              <Field label="Headcode">
                <input
                  type="text"
                  value={sf.headcode}
                  onChange={(e) => update({ headcode: e.target.value.toUpperCase() })}
                  placeholder="1Y13"
                  className={inp}
                  maxLength={4}
                />
              </Field>
              <Field label="Dep. time">
                <input
                  type="text"
                  value={sf.serviceTime}
                  onChange={(e) => update({ serviceTime: e.target.value })}
                  placeholder="10:09"
                  className={inp}
                />
              </Field>
              <Field label="Unit / set">
                <input
                  type="text"
                  value={sf.unitNumber}
                  onChange={(e) => update({ unitNumber: e.target.value })}
                  placeholder="170416"
                  className={inp}
                />
              </Field>
            </div>
          )}

          {showHeadcode && (
            <div className={`${row} grid-cols-2`}>
              <Field label="From">
                <input
                  type="text"
                  value={sf.serviceOrigin}
                  onChange={(e) => update({ serviceOrigin: e.target.value.toUpperCase() })}
                  placeholder="LEEDS"
                  className={inp}
                />
              </Field>
              <Field label="To">
                <input
                  type="text"
                  value={sf.serviceDestination}
                  onChange={(e) => update({ serviceDestination: e.target.value.toUpperCase() })}
                  placeholder="NOTTINGHM"
                  className={inp}
                />
              </Field>
            </div>
          )}

          <Field label="Location">
            <input
              type="text"
              value={sf.location}
              onChange={(e) => update({ location: e.target.value })}
              placeholder="signal / milepost / station / UWC name…"
              className={inp}
            />
          </Field>

          {showLocationShort && (
            <Field label="Location (short — for header)">
              <input
                type="text"
                value={sf.locationShort}
                onChange={(e) => update({ locationShort: e.target.value })}
                placeholder="St Pancras Churchyard"
                className={inp}
              />
            </Field>
          )}

          {showSignal && (
            <Field label="Signal ID">
              <input
                type="text"
                value={sf.signalId}
                onChange={(e) => update({ signalId: e.target.value.toUpperCase() })}
                placeholder="WH21 / DC4878"
                className={inp}
              />
            </Field>
          )}

          {showTcId && (
            <Field label="T/C ID">
              <input
                type="text"
                value={sf.tcId}
                onChange={(e) => update({ tcId: e.target.value })}
                placeholder="2723"
                className={inp}
              />
            </Field>
          )}

          {showRouting && (
            <div className={`${row} grid-cols-2`}>
              <Field label="Route offered (wrong route)">
                <input
                  type="text"
                  value={sf.routeOffered}
                  onChange={(e) => update({ routeOffered: e.target.value })}
                  placeholder="Derby"
                  className={inp}
                />
              </Field>
              <Field label="Route booked (vice)">
                <input
                  type="text"
                  value={sf.routeBooked}
                  onChange={(e) => update({ routeBooked: e.target.value })}
                  placeholder="Alfreton"
                  className={inp}
                />
              </Field>
            </div>
          )}

          {showSpeed && (
            <div className={`${row} grid-cols-2`}>
              <Field label="Speed at activation">
                <input
                  type="text"
                  value={sf.speedMph}
                  onChange={(e) => update({ speedMph: e.target.value })}
                  placeholder="90mph"
                  className={inp}
                />
              </Field>
              <Field label="OSS / PSR set point">
                <input
                  type="text"
                  value={sf.ossSetMph}
                  onChange={(e) => update({ ossSetMph: e.target.value })}
                  placeholder="65mph"
                  className={inp}
                />
              </Field>
            </div>
          )}

          {showStaffAccident && (
            <>
              <div className={`${row} grid-cols-2`}>
                <Field label="IP role">
                  <input
                    type="text"
                    value={sf.ipRole}
                    onChange={(e) => update({ ipRole: e.target.value })}
                    placeholder="Foley Signaller"
                    className={inp}
                  />
                </Field>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sf.isLateReport}
                      onChange={(e) => update({ isLateReport: e.target.checked })}
                      className="accent-accent w-3.5 h-3.5"
                    />
                    Late report
                  </label>
                </div>
              </div>
              <Field label="Injury phrase">
                <input
                  type="text"
                  value={sf.injuryPhrase}
                  onChange={(e) => update({ injuryPhrase: e.target.value })}
                  placeholder="injured their lower back pulling a lever from the frame"
                  className={inp}
                />
              </Field>
            </>
          )}

          {sf.category === "wstcf_autumn" && (
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={sf.isAutumnRelated}
                onChange={(e) => update({ isAutumnRelated: e.target.checked })}
                className="accent-accent w-3.5 h-3.5"
              />
              Confirmed autumn-related (adds 🍂 marker)
            </label>
          )}

          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={sf.headerOverride}
              onChange={(e) => update({ headerOverride: e.target.checked })}
              className="accent-accent w-3.5 h-3.5"
            />
            Force identified header (headcode + location in header)
          </label>
        </Section>

        {/* Beat 2 — Mechanism */}
        <Section title="Beat 2 — Mechanism (facts only)">
          <textarea
            value={sf.mechanism}
            onChange={(e) => update({ mechanism: e.target.value })}
            rows={4}
            placeholder="Technical detail — signal IDs, speeds, sequences, cause if known. No editorialising."
            className={`${inp} resize-y`}
          />
          <div className="text-xs text-muted/60 font-mono">
            {sf.mechanism.length} chars — include signal IDs, times, technical cause
          </div>
        </Section>

        {/* Beat 3 — Driver welfare */}
        {showDriverWelfare && (
          <Section title="Beat 3 — Driver welfare">
            <div className={`${row} grid-cols-1`}>
              <Field label="Driver welfare">
                <select
                  value={sf.driverWelfare}
                  onChange={(e) => update({ driverWelfare: e.target.value })}
                  className={sel}
                >
                  {DRIVER_WELFARE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </Field>
              {sf.driverWelfare === "relieved" && (
                <Field label="Relief location">
                  <input
                    type="text"
                    value={sf.driverReliefLocation}
                    onChange={(e) => update({ driverReliefLocation: e.target.value })}
                    placeholder="Kettering"
                    className={inp}
                  />
                </Field>
              )}
            </div>
          </Section>
        )}

        {/* Beat 4 — Actions & handovers */}
        <Section title="Beat 4 — Actions & handovers">
          <div className="flex flex-col gap-1.5">
            {ACTION_CHIPS.map((chip) => {
              const selected = isChipSelected(chip.id);
              const selChip = sf.actionChips.find((c) => c.chipId === chip.id);
              return (
                <div key={chip.id}>
                  <ChipButton selected={selected} onClick={() => toggleChip(chip.id)}>
                    {chip.label}
                  </ChipButton>
                  {selected && chip.hasParam && (
                    <input
                      type="text"
                      value={selChip?.param ?? ""}
                      onChange={(e) => setChipParam(chip.id, e.target.value)}
                      placeholder={chip.paramPlaceholder}
                      className={`${inp} mt-1`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* Delay */}
        <Section title="Delay outcome">
          <Field label="Outcome">
            <select
              value={sf.delayOutcome}
              onChange={(e) => update({ delayOutcome: e.target.value })}
              className={sel}
            >
              {DELAY_OUTCOMES.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </Field>
          {sf.delayOutcome === "otm" && (
            <div className={`${row} grid-cols-2`}>
              <Field label="OTM time (HH:MM)">
                <input
                  type="text"
                  value={sf.delayTime}
                  onChange={(e) => update({ delayTime: e.target.value })}
                  placeholder="14:32"
                  className={inp}
                />
              </Field>
              <Field label="Minutes late">
                <input
                  type="text"
                  value={sf.delayMinutes}
                  onChange={(e) => update({ delayMinutes: e.target.value })}
                  placeholder="8"
                  className={inp}
                />
              </Field>
            </div>
          )}
        </Section>

        {/* Clear */}
        <div className="pt-2 border-t border-grid/40">
          <button
            onClick={() => {
              if (window.confirm("Clear the safety form?")) clearSafety();
            }}
            className="px-4 py-2 rounded font-semibold bg-warn/10 text-warn border border-warn/30 hover:bg-warn/20 transition-colors"
          >
            Clear form
          </button>
        </div>
      </div>

      {/* ── Right: live preview ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-widest text-muted">
            Live preview
          </span>
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 rounded text-sm font-mono border border-accent/50 text-accent hover:bg-accent/10 transition-colors"
          >
            Copy
          </button>
        </div>

        {/* Preview pane */}
        <pre
          className={clsx(
            "flex-1 rounded border p-4 text-sm font-mono whitespace-pre-wrap break-words leading-relaxed",
            "bg-panel2 border-grid text-ink overflow-y-auto",
            "min-h-[200px]"
          )}
        >
          {rendered || <span className="text-muted/40 italic">Fill the form to build the message…</span>}
        </pre>

        {/* Linter */}
        {lint.warnings.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-xs font-mono uppercase tracking-widest text-warn/70">
              Linter warnings
            </div>
            {lint.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-sm text-warn">
                <span className="mt-px">⚠</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
        {lint.ok && rendered && (
          <div className="text-sm text-green-500/70 font-mono">✓ Linter: all checks passed</div>
        )}

        {/* Beat 1 preview inline */}
        <div className="text-xs font-mono text-muted/50 uppercase tracking-widest">
          Beat 1 auto-built from structured fields · Beat 2 from mechanism field · Beat 4 from chips
        </div>
      </div>
    </div>
  );
}
