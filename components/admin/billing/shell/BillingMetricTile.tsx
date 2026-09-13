import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BillingMetricTileProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  className?: string;
};

export default function BillingMetricTile({
  label,
  value,
  hint,
  icon,
  className,
}: BillingMetricTileProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] px-4 py-3.5",
        "bg-[color-mix(in_srgb,var(--card)_88%,transparent)]",
        "ring-1 ring-[color-mix(in_srgb,var(--border)_50%,transparent)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[var(--text-2)]">
            {label}
          </p>
          <p className="mt-2 text-[1.35rem] font-semibold tabular-nums tracking-tight text-[var(--foreground)] sm:text-[1.75rem]">
            {value}
          </p>
          {hint ? (
            <p className="mt-1.5 text-xs text-[var(--text-2)] leading-snug">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[color-mix(in_srgb,var(--muted)_85%,var(--foreground))] opacity-70"
            aria-hidden
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
