"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { SCE_FORM_CONTROL_MICRO_UX_INVALID_INPUT_CLASS } from "@/lib/design-system/sce-form-control-micro-ux";

export type SceTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

/** Canonical SCE textarea — aligned with text input language. */
export const SceTextarea = forwardRef<HTMLTextAreaElement, SceTextareaProps>(
  function SceTextarea({ className, invalid, disabled, readOnly, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={invalid || props["aria-invalid"] ? true : undefined}
        data-sce-textarea="true"
        data-readonly={readOnly ? "true" : undefined}
        className={cn(
          "fca-textarea w-full min-h-[5rem] resize-y",
          readOnly ? "cursor-default bg-[var(--surface-2)]/60 text-[var(--text-2)]" : "",
          invalid ? SCE_FORM_CONTROL_MICRO_UX_INVALID_INPUT_CLASS : "",
          className,
        )}
        {...props}
      />
    );
  },
);
