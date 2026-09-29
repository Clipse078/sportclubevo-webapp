"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type SceToolbarSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

/**
 * Dark SCE toolbar select — avoids native light-theme leakage in admin surfaces.
 */
export default function SceToolbarSelect({
  className = "",
  wrapperClassName = "",
  ...props
}: SceToolbarSelectProps) {
  return (
    <div className={cn("relative min-w-0", wrapperClassName)}>
      <select
        {...props}
        className={cn(
          "fca-select sce-toolbar-select h-9 w-full min-w-0 appearance-none pr-8 text-sm lg:w-auto",
          className,
        )}
      />
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
        aria-hidden
      />
    </div>
  );
}
