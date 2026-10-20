"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type SceCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Canonical checkbox for legitimate multi-selection, row selection, and consent —
 * **not** for binary ON/OFF settings (use SwitchToggle).
 */
export const SceCheckbox = forwardRef<HTMLInputElement, SceCheckboxProps>(
  function SceCheckbox({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="checkbox"
        data-sce-checkbox="true"
        className={cn(
          "h-4 w-4 shrink-0 rounded border-[var(--border)] accent-[var(--sce-color-accent-primary)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sce-color-app-background)]",
          className,
        )}
        {...props}
      />
    );
  },
);
