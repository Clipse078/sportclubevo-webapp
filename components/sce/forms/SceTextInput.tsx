"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type SceTextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

/**
 * Canonical SCE text input — consumes `.fca-input` tokens from globals.css.
 */
export const SceTextInput = forwardRef<HTMLInputElement, SceTextInputProps>(
  function SceTextInput({ className, invalid, disabled, readOnly, ...props }, ref) {
    return (
      <input
        ref={ref}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={invalid || props["aria-invalid"] ? true : undefined}
        data-sce-text-input="true"
        data-readonly={readOnly ? "true" : undefined}
        className={cn(
          "fca-input w-full",
          readOnly ? "cursor-default bg-[var(--surface-2)]/60 text-[var(--text-2)]" : "",
          className,
        )}
        {...props}
      />
    );
  },
);
