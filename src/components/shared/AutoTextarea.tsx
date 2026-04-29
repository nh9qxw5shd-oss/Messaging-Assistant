"use client";
import { useEffect, useRef } from "react";
import clsx from "clsx";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  readOnly?: boolean;
}

export default function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
  minRows = 2,
  readOnly = false,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      placeholder={placeholder}
      rows={minRows}
      className={clsx(
        "w-full resize-none rounded bg-panel2 border border-grid px-3 py-2",
        "text-ink font-sans leading-relaxed",
        "placeholder:text-muted",
        "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
        "transition-colors duration-150",
        readOnly && "font-mono cursor-default",
        className
      )}
    />
  );
}
