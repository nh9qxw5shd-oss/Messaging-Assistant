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
import { AlertTriangle, Check, Copy, Trash2 } from "lucide-react";
import { Badge, Card, Field } from "@/components/ui";
import { useDialog } from "@/components/uiFeedback";
import TabHeader from "@/components/TabHeader";

// ─── Shared layout ────────────────────────────────────────────────────────────

const row = "grid gap-3";

// ─── Main component ───────────────────────────────────────────────────────────

export default function SafetyTab() {
  const { safety_msg: sf, setSafety, clearSafety, showToast } = useStore();
  const dialog = useDialog();

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

  async function handleClear() {
    const ok = await dialog.confirm({
      title: "Clear the safety form?",
      confirmLabel: "Clear form",
      danger: true,
    });
    if (ok) clearSafety();
  }

  return (
    <>
      <TabHeader
        tab="safety_msg"
        actions={
          <button type="button" onClick={handleClear} className="btn btn-danger">
            <Trash2 size={14} /> Clear form
          </button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
        {/* ── Left: form ────────────────────────────────────────────────────── */}
        <div className="stagger flex min-w-0 flex-col gap-4">

          {/* Status type */}
          <Card title="Status">
            <div className={`${row} grid-cols-2 sm:grid-cols-4`}>
              {(["new", "update", "6hour", "closed"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ statusType: s })}
                  className="chip justify-center"
                  aria-pressed={sf.statusType === s}
                >
                  {s === "6hour" ? "6hr upd." : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </Card>

          {/* Beat 1 — Source & headline */}
          <Card title="Beat 1 — Source & headline">
            <div className="flex flex-col gap-3">
              <div className={`${row} sm:grid-cols-2`}>
                <Field label="Reporter">
                  <select
                    value={sf.reporterType}
                    onChange={(e) => update({ reporterType: e.target.value })}
                    className="input"
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
                      className="input"
                    />
                  </Field>
                )}
              </div>

              <div className={`${row} sm:grid-cols-2`}>
                <Field label="Category">
                  <select
                    value={sf.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="input"
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
                      className="input"
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
                      className="input font-mono"
                      maxLength={4}
                    />
                  </Field>
                  <Field label="Dep. time">
                    <input
                      type="text"
                      value={sf.serviceTime}
                      onChange={(e) => update({ serviceTime: e.target.value })}
                      placeholder="10:09"
                      className="input font-mono"
                    />
                  </Field>
                  <Field label="Unit / set">
                    <input
                      type="text"
                      value={sf.unitNumber}
                      onChange={(e) => update({ unitNumber: e.target.value })}
                      placeholder="170416"
                      className="input font-mono"
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
                      className="input"
                    />
                  </Field>
                  <Field label="To">
                    <input
                      type="text"
                      value={sf.serviceDestination}
                      onChange={(e) => update({ serviceDestination: e.target.value.toUpperCase() })}
                      placeholder="NOTTINGHM"
                      className="input"
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
                  className="input"
                />
              </Field>

              {showLocationShort && (
                <Field label="Location (short — for header)">
                  <input
                    type="text"
                    value={sf.locationShort}
                    onChange={(e) => update({ locationShort: e.target.value })}
                    placeholder="St Pancras Churchyard"
                    className="input"
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
                    className="input font-mono"
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
                    className="input font-mono"
                  />
                </Field>
              )}

              {showRouting && (
                <div className={`${row} sm:grid-cols-2`}>
                  <Field label="Route offered (wrong route)">
                    <input
                      type="text"
                      value={sf.routeOffered}
                      onChange={(e) => update({ routeOffered: e.target.value })}
                      placeholder="Derby"
                      className="input"
                    />
                  </Field>
                  <Field label="Route booked (vice)">
                    <input
                      type="text"
                      value={sf.routeBooked}
                      onChange={(e) => update({ routeBooked: e.target.value })}
                      placeholder="Alfreton"
                      className="input"
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
                      className="input font-mono"
                    />
                  </Field>
                  <Field label="OSS / PSR set point">
                    <input
                      type="text"
                      value={sf.ossSetMph}
                      onChange={(e) => update({ ossSetMph: e.target.value })}
                      placeholder="65mph"
                      className="input font-mono"
                    />
                  </Field>
                </div>
              )}

              {showStaffAccident && (
                <>
                  <div className={`${row} sm:grid-cols-2`}>
                    <Field label="IP role">
                      <input
                        type="text"
                        value={sf.ipRole}
                        onChange={(e) => update({ ipRole: e.target.value })}
                        placeholder="Foley Signaller"
                        className="input"
                      />
                    </Field>
                    <div className="flex items-end pb-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={sf.isLateReport}
                          onChange={(e) => update({ isLateReport: e.target.checked })}
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
                      className="input"
                    />
                  </Field>
                </>
              )}

              {sf.category === "wstcf_autumn" && (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sf.isAutumnRelated}
                    onChange={(e) => update({ isAutumnRelated: e.target.checked })}
                  />
                  Confirmed autumn-related (adds 🍂 marker)
                </label>
              )}

              <label className="flex cursor-pointer items-center gap-2 text-sm text-dim">
                <input
                  type="checkbox"
                  checked={sf.headerOverride}
                  onChange={(e) => update({ headerOverride: e.target.checked })}
                />
                Force identified header (headcode + location in header)
              </label>
            </div>
          </Card>

          {/* Beat 2 — Mechanism */}
          <Card title="Beat 2 — Mechanism" subtitle="Facts only">
            <textarea
              value={sf.mechanism}
              onChange={(e) => update({ mechanism: e.target.value })}
              rows={4}
              placeholder="Technical detail — signal IDs, speeds, sequences, cause if known. No editorialising."
              className="input resize-y"
            />
            <div className="mt-1.5 text-xs text-faint">
              <span className="font-mono">{sf.mechanism.length}</span> chars — include signal IDs, times, technical cause
            </div>
          </Card>

          {/* Beat 3 — Driver welfare */}
          {showDriverWelfare && (
            <Card title="Beat 3 — Driver welfare">
              <div className={`${row} grid-cols-1`}>
                <Field label="Driver welfare">
                  <select
                    value={sf.driverWelfare}
                    onChange={(e) => update({ driverWelfare: e.target.value })}
                    className="input"
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
                      className="input"
                    />
                  </Field>
                )}
              </div>
            </Card>
          )}

          {/* Beat 4 — Actions & handovers */}
          <Card title="Beat 4 — Actions & handovers">
            <div className="flex flex-col gap-1.5">
              {ACTION_CHIPS.map((chip) => {
                const selected = isChipSelected(chip.id);
                const selChip = sf.actionChips.find((c) => c.chipId === chip.id);
                return (
                  <div key={chip.id}>
                    <button
                      type="button"
                      onClick={() => toggleChip(chip.id)}
                      className="chip max-w-full text-left"
                      aria-pressed={selected}
                    >
                      {chip.label}
                    </button>
                    {selected && chip.hasParam && (
                      <input
                        type="text"
                        value={selChip?.param ?? ""}
                        onChange={(e) => setChipParam(chip.id, e.target.value)}
                        placeholder={chip.paramPlaceholder}
                        className="input mt-1"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Delay */}
          <Card title="Delay outcome">
            <div className="flex flex-col gap-3">
              <Field label="Outcome">
                <select
                  value={sf.delayOutcome}
                  onChange={(e) => update({ delayOutcome: e.target.value })}
                  className="input"
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
                      className="input font-mono"
                    />
                  </Field>
                  <Field label="Minutes late">
                    <input
                      type="text"
                      value={sf.delayMinutes}
                      onChange={(e) => update({ delayMinutes: e.target.value })}
                      placeholder="8"
                      className="input font-mono"
                    />
                  </Field>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Right: live preview ────────────────────────────────────────────── */}
        <div className="min-w-0 lg:sticky lg:top-4">
          <Card
            title="Live preview"
            subtitle="Beat 1 auto-built from structured fields · Beat 2 from mechanism field · Beat 4 from chips"
            action={
              <button type="button" onClick={copyToClipboard} className="btn btn-primary btn-sm">
                <Copy size={14} /> Copy
              </button>
            }
          >
            <pre className="min-h-[200px] whitespace-pre-wrap break-words rounded-[7px] border border-edge bg-sunken p-4 font-mono text-sm leading-relaxed">
              {rendered || <span className="italic text-faint">Fill the form to build the message…</span>}
            </pre>

            {/* Linter */}
            {lint.warnings.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                <div className="lbl mb-0" style={{ color: "var(--moderate)" }}>
                  Linter warnings
                </div>
                {lint.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-sm" style={{ color: "var(--moderate)" }}>
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
            {lint.ok && rendered && (
              <div className="mt-3">
                <Badge color="var(--good)">
                  <Check size={13} /> Linter: all checks passed
                </Badge>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
