import Link from "next/link";
import { cn } from "@/lib/cn";

export type SceSegmentLinkOption<T extends string> = {
  value: T;
  label: string;
  href: string;
};

type Props<T extends string> = {
  options: readonly SceSegmentLinkOption<T>[];
  value: T;
  "aria-label": string;
  testId?: string;
  size?: "sm" | "md";
};

/**
 * URL-driven segmented control for server-rendered pages.
 * Visual contract matches SceSegmentedControl.
 */
export function SceSegmentedLinkGroup<T extends string>({
  options,
  value,
  "aria-label": ariaLabel,
  testId = "sce-segmented-link-group",
  size = "sm",
}: Props<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} data-testid={testId} className="flex flex-wrap gap-1">
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <Link
            key={option.value}
            href={option.href}
            role="radio"
            aria-checked={isSelected}
            data-testid={`${testId}-${String(option.value).toLowerCase()}`}
            className={cn(
              "rounded-lg border px-3 font-medium transition-colors",
              size === "sm" ? "py-1.5 text-xs" : "py-2 text-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
              isSelected
                ? "border-[color-mix(in_srgb,var(--sce-accent)_45%,var(--border-strong))] bg-[color-mix(in_srgb,var(--sce-accent)_14%,var(--surface))] text-[var(--foreground)] shadow-sm"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
