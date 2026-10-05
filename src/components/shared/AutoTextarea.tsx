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
        "input resize-none leading-relaxed",
        readOnly && "cursor-default",
        className
      )}
    />
  );
}
