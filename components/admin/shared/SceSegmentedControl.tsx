"use client";

import { cn } from "@/lib/cn";

export type SceSegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SceSegmentedControlProps<T extends string> = {
  options: readonly SceSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  testId?: string;
  disabled?: boolean;
  size?: "sm" | "md";
};

export function SceSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  testId = "sce-segmented-control",
  disabled = false,
  size = "sm",
}: SceSegmentedControlProps<T>) {
  const currentIndex = options.findIndex((o) => o.value === value);

  function move(delta: number) {
    if (options.length === 0) return;
    const next = (currentIndex + delta + options.length) % options.length;
    onChange(options[next]!.value);
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-testid={testId}
      className="flex flex-wrap gap-1"
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            data-testid={`${testId}-option-${option.value}`}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(-1);
              }
            }}
            className={cn(
              "rounded-lg border px-3 font-medium transition-colors",
              size === "sm" ? "py-1.5 text-xs" : "py-2 text-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? "border-[color-mix(in_srgb,var(--sce-accent)_45%,var(--border-strong))] bg-[color-mix(in_srgb,var(--sce-accent)_14%,var(--surface))] text-[var(--foreground)] shadow-sm"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
