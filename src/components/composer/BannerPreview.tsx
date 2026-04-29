"use client";
import Image from "next/image";
import { BANNER_FILES } from "@/lib/constants";
import type { TabKey } from "@/lib/types";

export default function BannerPreview({ activeTab }: { activeTab: TabKey }) {
  const src = BANNER_FILES[activeTab];
  if (!src) return null;
  return (
    <div className="rounded overflow-hidden border border-grid/60">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Banner"
        className="w-full h-auto block"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}
