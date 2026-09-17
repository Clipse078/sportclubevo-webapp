"use client";

import { cn } from "@/lib/cn";

type Props = {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
};

/** SCE minutes field — hides native browser number spinners while keeping type=number. */
export function MinutesDurationInput({
  id,
  value,
  onChange,
  min = 1,
  max = 480,
  disabled,
  className,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: Props) {
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      aria-label={ariaLabel}
      data-testid={testId}
      disabled={disabled}
      className={cn("fca-input fca-minutes-input text-right text-sm tabular-nums", className)}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}
