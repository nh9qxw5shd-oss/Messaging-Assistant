// Window events that let the command palette drive the composer without a
// shared component tree.
export const BUILD_EVENT = "ma:build";
export const COPY_EVENT = "ma:copy";
export const PALETTE_EVENT = "ma:palette";

export function requestBuild(): void { window.dispatchEvent(new CustomEvent(BUILD_EVENT)); }
export function requestCopy(): void { window.dispatchEvent(new CustomEvent(COPY_EVENT)); }
export function openPalette(): void { window.dispatchEvent(new CustomEvent(PALETTE_EVENT)); }
