"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatIsoDateKeyToDisplay,
  parseDisplayDateInput,
} from "@/lib/sce/activity-datetime/sce-activity-datetime";
import { SceActivityCalendarPopover } from "./SceActivityCalendarPopover";

export type SceActivityDateInputProps = {
  label: string;
  helperText?: string;
  /** ISO date key YYYY-MM-DD — empty when unset. */
  value: string;
  onChange: (isoDateKey: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  testId?: string;
  inputClassName?: string;
};

export function SceActivityDateInput({
  label,
  helperText = "TT.MM.JJJJ",
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  testId,
  inputClassName,
}: SceActivityDateInputProps) {
  const inputId = useId();
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draftText, setDraftText] = useState(() => (value ? formatIsoDateKeyToDisplay(value) : ""));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDraftText(value ? formatIsoDateKeyToDisplay(value) : "");
  }, [value]);

  const displayValue = draftText;
  const resolvedError = error ?? localError;

  function commitText(nextText: string) {
    const parsed = parseDisplayDateInput(nextText);
    if (!parsed.ok) {
      setLocalError(parsed.error);
      return;
    }
    setLocalError(null);
    setDraftText(parsed.display);
    onChange(parsed.isoDateKey);
  }

  return (
    <div className="block min-w-0 space-y-1.5" data-testid={testId}>
      <label htmlFor={inputId} className="fca-label block">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      {helperText ? (
        <p id={helperId} className="text-[11px] text-[var(--text-2)]">
          {helperText}
        </p>
      ) : null}
      <div ref={anchorRef} className="relative flex min-w-0 items-center gap-2">
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
          value={displayValue}
          placeholder="TT.MM.JJJJ"
          onChange={(e) => {
            setDraftText(e.target.value);
            setLocalError(null);
          }}
          onBlur={() => commitText(draftText)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitText(draftText);
              inputRef.current?.blur();
            }
          }}
          className={cn("fca-input min-w-0 flex-1 text-sm", inputClassName)}
          data-testid={testId ? `${testId}-input` : undefined}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label} — Kalender öffnen`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-2)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
          data-testid={testId ? `${testId}-calendar` : undefined}
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {resolvedError ? (
        <p id={errorId} role="alert" className="text-xs text-[var(--sce-danger)]">
          {resolvedError}
        </p>
      ) : null}
      <SceActivityCalendarPopover
        open={open}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        isoDateKey={value || new Date().toISOString().slice(0, 10)}
        onSelectDate={(isoDateKey) => {
          setDraftText(formatIsoDateKeyToDisplay(isoDateKey));
          setLocalError(null);
          onChange(isoDateKey);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        id={`${inputId}-calendar`}
      />
    </div>
  );
}
