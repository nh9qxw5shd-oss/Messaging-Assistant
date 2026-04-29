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
        "relative bg-panel border border-grid/70 rounded-2xl overflow-hidden",
        "shadow-lift-sm",
        "transition-shadow duration-300 hover:shadow-lift",
        // Subtle orange accent top edge
        "before:absolute before:inset-x-0 before:top-0 before:h-[1.5px]",
        "before:bg-gradient-to-r before:from-transparent before:via-accent/30 before:to-transparent",
        // Corner mark
        "after:absolute after:bottom-0 after:right-0 after:w-2.5 after:h-2.5",
        "after:border-b after:border-r after:border-accent/20 after:rounded-br-2xl",
        !noPad && "p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
