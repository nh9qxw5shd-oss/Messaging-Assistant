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
    <select value={value} onChange={(e) => onChange(e.target.value)} className={clsx("input cursor-pointer", className)}>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
