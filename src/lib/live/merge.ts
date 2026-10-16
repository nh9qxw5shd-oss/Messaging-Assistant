// Merging a section edited here with the same section moved on elsewhere.
//
// Three versions: base (the last one both sides agreed, as read from the
// database), local (this copy) and remote (the database now). Each top-level
// field keeps the side that changed it; where both changed the same field to
// different values, this copy wins (it is the one being typed in) and the field
// is reported as a conflict so the other version can be kept as a backup.
// Incidents merge per incident (by id), then per field within each.
//
// Pure, no runtime imports, so the rules are unit-tested with node --test.

type Rec = Record<string, unknown>;

/** Deep equality that ignores key order (the database returns jsonb keys reordered). */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    // undefined and a missing key read the same.
    return a === b;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((v, i) => sameValue(v, bb[i]));
  }
  const ar = a as Rec, br = b as Rec;
  const keys = new Set([...Object.keys(ar), ...Object.keys(br)]);
  for (const k of keys) if (!sameValue(ar[k], br[k])) return false;
  return true;
}

function isRec(v: unknown): v is Rec {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export interface Merged<T> {
  value: T;
  /** Fields both sides changed to different values; this copy's value was kept. */
  conflicts: string[];
}

/** Merge one record field by field. A missing base means nothing was agreed: remote wins outright. */
export function mergeRecord<T>(base: T | undefined, local: T, remote: T): Merged<T> {
  if (!isRec(local) || !isRec(remote)) return { value: base === undefined ? remote : sameValue(local, base) ? remote : local, conflicts: [] };
  if (!isRec(base)) return { value: remote, conflicts: [] };
  const out: Rec = { ...remote };
  const conflicts: string[] = [];
  for (const k of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
    const localChanged = !sameValue(local[k], base[k]);
    if (!localChanged) continue;
    const remoteChanged = !sameValue(remote[k], base[k]);
    if (remoteChanged && !sameValue(local[k], remote[k])) conflicts.push(k);
    if (k in local) out[k] = local[k];
    else delete out[k];
  }
  return { value: out as T, conflicts };
}

interface WithId { id: string }

/**
 * Merge two lists of incidents by id. New incidents from either side are kept;
 * one deleted on one side is dropped unless the other side has changed it since.
 * Incidents are only ever added at the top, so the order is: new here, then
 * the database's order, then any left over from this copy.
 */
export function mergeById<T extends WithId>(base: T[] | undefined, local: T[], remote: T[]): Merged<T[]> {
  if (!base) return { value: remote, conflicts: [] };
  const b = new Map(base.map((i) => [i.id, i]));
  const l = new Map(local.map((i) => [i.id, i]));
  const r = new Map(remote.map((i) => [i.id, i]));
  const conflicts: string[] = [];
  const pick = (id: string): T | null => {
    const bi = b.get(id), li = l.get(id), ri = r.get(id);
    if (li && ri) {
      const m = mergeRecord(bi, li, ri);
      conflicts.push(...m.conflicts.map((f) => `${id}.${f}`));
      return m.value;
    }
    if (li) {
      // Not on remote: new here, or deleted there.
      if (!bi) return li;
      return sameValue(li, bi) ? null : li;
    }
    if (ri) {
      if (!bi) return ri;
      return sameValue(ri, bi) ? null : ri;
    }
    return null;
  };
  const newHere = local.filter((i) => !b.has(i.id) && !r.has(i.id)).map((i) => i.id);
  const order = [...newHere, ...remote.map((i) => i.id), ...local.map((i) => i.id)];
  const seen = new Set<string>();
  const value: T[] = [];
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    const v = pick(id);
    if (v) value.push(v);
  }
  return { value, conflicts };
}
