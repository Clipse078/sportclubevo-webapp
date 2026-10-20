"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  SCE_FORM_CONTROL_MICRO_UX_MARKERS,
  SCE_FORM_CONTROL_MICRO_UX_SELECT_CHEVRON_SIZE_CLASS,
} from "@/lib/design-system/sce-form-control-micro-ux";

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
        {...{ [SCE_FORM_CONTROL_MICRO_UX_MARKERS.TOOLBAR_SELECT]: "true" }}
        className={cn(
          "fca-select sce-toolbar-select h-9 w-full min-w-0 appearance-none pr-8 text-sm lg:w-auto",
          className,
        )}
      />
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]",
          SCE_FORM_CONTROL_MICRO_UX_SELECT_CHEVRON_SIZE_CLASS,
        )}
        aria-hidden
      />
    </div>
  );
}
