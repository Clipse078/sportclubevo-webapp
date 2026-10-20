"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { normalizeTimeInput } from "@/lib/sce/activity-datetime/sce-activity-datetime";
import {
  SCE_FORM_CONTROL_MICRO_UX_FIELD_ERROR_CLASS,
  SCE_FORM_CONTROL_MICRO_UX_FIELD_STACK_CLASS,
  SCE_FORM_CONTROL_MICRO_UX_MARKERS,
  SCE_FORM_CONTROL_MICRO_UX_REQUIRED_MARKER_CLASS,
} from "@/lib/design-system/sce-form-control-micro-ux";

export type SceActivityTimeInputProps = {
  label: string;
  helperText?: string;
  value: string;
  onChange: (normalizedTime: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  testId?: string;
  inputClassName?: string;
  /** Compact rows (e.g. weekday grid) — label stays available to screen readers. */
  compact?: boolean;
};

export function SceActivityTimeInput({
  label,
  helperText = "HH:MM",
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  testId,
  inputClassName,
  compact = false,
}: SceActivityTimeInputProps) {
  const inputId = useId();
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftText, setDraftText] = useState(value);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDraftText(value);
  }, [value]);

  const resolvedError = error ?? localError;

  function commitText(nextText: string) {
    const parsed = normalizeTimeInput(nextText);
    if (!parsed.ok) {
      setLocalError(parsed.error);
      return;
    }
    setLocalError(null);
    setDraftText(parsed.normalized);
    onChange(parsed.normalized);
  }

  return (
    <div
      className={cn("block min-w-0", SCE_FORM_CONTROL_MICRO_UX_FIELD_STACK_CLASS)}
      data-testid={testId}
      {...{ [SCE_FORM_CONTROL_MICRO_UX_MARKERS.ACTIVITY_TIME]: "true" }}
    >
      <label htmlFor={inputId} className={compact ? "sr-only" : "fca-label block"}>
        {label}
        {required ? (
          <>
            <span className={SCE_FORM_CONTROL_MICRO_UX_REQUIRED_MARKER_CLASS} aria-hidden>
              {" "}
              *
            </span>
            <span className="sr-only"> (Pflichtfeld)</span>
          </>
        ) : null}
      </label>
      {helperText && !compact ? (
        <p id={helperId} className="text-[11px] text-[var(--text-2)]">
          {helperText}
        </p>
      ) : null}
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(resolvedError)}
        aria-describedby={[helperText ? helperId : null, resolvedError ? errorId : null]
          .filter(Boolean)
          .join(" ") || undefined}
        value={draftText}
        placeholder="HH:MM"
        onChange={(e) => {
          setDraftText(e.target.value);
          setLocalError(null);
        }}
        onBlur={() => commitText(draftText)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Tab") {
            commitText(draftText);
          }
        }}
        className={cn("fca-input w-full text-sm", inputClassName)}
        data-testid={testId ? `${testId}-input` : undefined}
      />
      {resolvedError ? (
        <p id={errorId} role="alert" className={SCE_FORM_CONTROL_MICRO_UX_FIELD_ERROR_CLASS}>
          {resolvedError}
        </p>
      ) : null}
    </div>
  );
}
