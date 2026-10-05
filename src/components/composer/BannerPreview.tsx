"use client";
import { BANNER_FILES } from "@/lib/constants";
import type { TabKey } from "@/lib/types";

export default function BannerPreview({ activeTab }: { activeTab: TabKey }) {
  const src = BANNER_FILES[activeTab];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Message banner"
      className="block h-auto w-full rounded-md"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
