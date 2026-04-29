"use client";
import clsx from "clsx";

interface Props {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  className?: string;
}

export default function StatusSelect({ value, options, onChange, className }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        "w-full rounded bg-panel2 border border-grid px-3 py-2",
        "text-ink text-sm font-sans",
        "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
        "transition-colors duration-150 cursor-pointer",
        className
      )}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
