"use client";

import { type ReactNode, useId } from "react";
import { cn } from "@/lib/cn";
import type { SceFoundationDensityTier } from "@/lib/design-system/sce-foundation-contract";
import { SCE_FORM_DENSITY_DEFAULT } from "@/lib/design-system/sce-form-control-foundation";

export type SceFormFieldProps = {
  label: ReactNode;
  /** Associates label with control; pass when control is a single id'd element. */
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  description?: ReactNode;
  error?: string;
  warning?: string;
  status?: ReactNode;
  density?: SceFoundationDensityTier;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  children: ReactNode;
};

const labelDensityClass: Record<SceFoundationDensityTier, string> = {
  COMFORTABLE: "text-sm",
  COMPACT: "text-xs",
  DENSE: "text-xs",
};

export function SceFormField({
  label,
  htmlFor,
  required = false,
  optional = false,
  description,
  error,
  warning,
  status,
  density = SCE_FORM_DENSITY_DEFAULT,
  disabled = false,
  readOnly = false,
  className,
  children,
}: SceFormFieldProps) {
  const generatedDescriptionId = useId();
  const generatedErrorId = useId();
  const descriptionId = description ? generatedDescriptionId : undefined;
  const errorId = error ? generatedErrorId : undefined;

  return (
    <div
      className={cn("space-y-1.5", className)}
      data-sce-form-field="true"
      data-sce-form-field-density={density}
      data-disabled={disabled ? "true" : undefined}
      data-readonly={readOnly ? "true" : undefined}
    >
      <label
        htmlFor={htmlFor}
        className={cn(
          "block font-medium text-[var(--foreground)]",
          labelDensityClass[density],
          disabled ? "text-[var(--sce-color-text-disabled)]" : "",
          readOnly && !disabled ? "text-[var(--text-2)]" : "",
          htmlFor ? "cursor-pointer" : "",
        )}
      >
        {label}
        {required ? (
          <span className="ms-1 text-[var(--sce-color-status-error)]" aria-hidden>
            *
          </span>
        ) : null}
        {optional ? (
          <span className="ms-1 font-normal text-[var(--muted)]">(optional)</span>
        ) : null}
        {required ? <span className="sr-only"> (Pflichtfeld)</span> : null}
      </label>

      {description ? (
        <p id={descriptionId} className="text-xs text-[var(--muted)]">
          {description}
        </p>
      ) : null}

      <div
        className="min-w-0"
        data-sce-form-field-control="true"
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ") || undefined}
      >
        {children}
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-[var(--sce-color-status-error)]"
          data-sce-form-field-error="true"
        >
          {error}
        </p>
      ) : null}

      {warning && !error ? (
        <p className="text-xs font-medium text-[var(--sce-color-status-warning)]">{warning}</p>
      ) : null}

      {status ? <div className="text-xs text-[var(--muted)]">{status}</div> : null}
    </div>
  );
}
