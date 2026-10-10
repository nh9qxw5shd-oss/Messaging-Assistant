// The path prefix this app is served under (next.config.mjs `basePath`). Next.js adds it to
// <Link>, the router and its own assets; anything that builds a URL string by hand (fetch of an
// API route, <img src>, an absolute URL pasted into Teams) must add it here.

export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Root-relative path ("/api/x") → served path ("/messaging/api/x"). Anything else is returned as is. */
export function withBase(path: string, base: string = BASE_PATH): string {
  return path.startsWith("/") && !path.startsWith("//") ? `${base}${path}` : path;
}

/**
 * Absolute URL of a public asset for a message pasted elsewhere (Teams banner images).
 * `appUrl` is the deployment's origin; a trailing slash or an already-included base path is
 * tolerated. Empty `appUrl` → empty string, so callers keep omitting the image.
 */
export function absoluteAsset(appUrl: string, path: string, base: string = BASE_PATH): string {
  const origin = appUrl.trim().replace(/\/+$/, "");
  if (!origin) return "";
  const prefix = base && origin.endsWith(base) ? "" : base;
  return `${origin}${prefix}${path}`;
}
