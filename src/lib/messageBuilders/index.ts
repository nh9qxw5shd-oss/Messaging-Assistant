import type { TabKey } from "../types";
import type { AppStore } from "../store";
import { buildSoS } from "./buildSoS";
import { buildStrategicAM } from "./buildStrategicAM";
import { buildStrategicPM } from "./buildStrategicPM";
import { buildTactical } from "./buildTactical";
import { buildSafety } from "./buildSafety";

export function buildMessage(
  activeTab: TabKey,
  store: Pick<AppStore, "meta" | "sos" | "str_am" | "str_pm" | "tac" | "safety_msg">
): string {
  const { meta, sos, str_am, str_pm, tac, safety_msg } = store;

  switch (activeTab) {
    case "sos":          return buildSoS(meta, sos);
    case "strategic_am": return buildStrategicAM(meta, str_am);
    case "strategic_pm": return buildStrategicPM(meta, str_pm);
    case "tactical":     return buildTactical(meta, tac);
    case "safety_msg":   return buildSafety(meta, safety_msg);
    default:             return "";
  }
}

/**
 * Build Teams-compatible rich HTML payload.
 * Includes an absolute-URL banner image if the app URL is configured.
 */
export function buildTeamsHtml(
  plainText: string,
  activeTab: TabKey
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const bannerMap: Partial<Record<TabKey, string>> = {
    sos:          "/banners/sos.png",
    strategic_am: "/banners/strategic.png",
    strategic_pm: "/banners/strategic.png",
    tactical:     "/banners/tactical.png",
  };
  const bannerPath = bannerMap[activeTab];
  const bannerHtml =
    appUrl && bannerPath
      ? `<img src="${appUrl}${bannerPath}" alt="Banner" style="max-width:100%;height:auto;display:block;margin:0 0 8px 0;"><hr style="border:none;border-top:1px solid #ddd;margin:8px 0;">`
      : "";

  const body = plainText.replace(/\n/g, "<br>");
  return `${bannerHtml}${body}`;
}
