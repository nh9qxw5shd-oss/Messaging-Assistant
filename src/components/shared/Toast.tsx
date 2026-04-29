"use client";
import clsx from "clsx";

export default function Toast({ message }: { message: string | null }) {
  return (
    <div
      className={clsx(
        "fixed bottom-5 left-1/2 -translate-x-1/2 z-50",
        "px-4 py-2 rounded-full font-mono text-xs uppercase tracking-widest",
        "bg-accent text-white shadow-orange-glow",
        "transition-all duration-200",
        message
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      {message}
    </div>
  );
}
