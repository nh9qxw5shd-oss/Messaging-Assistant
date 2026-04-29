import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  noPad?: boolean;
}

export default function Card({ children, className, noPad }: Props) {
  return (
    <div
      className={clsx(
        "relative bg-panel border border-grid rounded-xl overflow-hidden",
        "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-accent/20",
        // Corner tick marks
        "after:absolute after:bottom-0 after:right-0 after:w-2 after:h-2",
        "after:border-b after:border-r after:border-accent/30",
        !noPad && "p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
