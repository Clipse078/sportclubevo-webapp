import Link from "next/link";
import { cn } from "@/lib/cn";

export type PlanningOperationalSummaryItem = {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  active?: boolean;
  tone?: "default" | "amber" | "emerald" | "muted" | "sky";
  "data-testid"?: string;
};

const toneClass: Record<NonNullable<PlanningOperationalSummaryItem["tone"]>, string> = {
  default: "text-[var(--foreground)]",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
  muted: "text-[var(--muted)]",
  sky: "text-sky-400",
};

type Props = {
  items: PlanningOperationalSummaryItem[];
  testId?: string;
  className?: string;
};

/** Compact operational counts — not hero KPI cards. */
export default function PlanningManagementOperationalSummary({
  items,
  testId = "planning-operational-summary",
  className,
}: Props) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-[var(--border)]/80 bg-[var(--surface)]/60 px-3 py-2",
        className,
      )}
      data-testid={testId}
      role="group"
      aria-label="Operative Übersicht"
    >
      {items.map((item) => {
        const content = (
          <>
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              {item.label}
            </span>
            <span
              className={cn(
                "text-base font-semibold tabular-nums leading-none",
                toneClass[item.tone ?? "default"],
              )}
            >
              {item.value}
            </span>
            {item.hint ? (
              <span className="sr-only">{item.hint}</span>
            ) : null}
          </>
        );

        const itemClass = cn(
          "inline-flex items-baseline gap-2 transition-opacity",
          item.href && "hover:opacity-90",
          item.active && "rounded-md bg-[var(--surface-2)]/90 px-2 py-0.5",
        );

        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              className={itemClass}
              data-testid={item["data-testid"]}
              aria-current={item.active ? "true" : undefined}
            >
              {content}
            </Link>
          );
        }

        return (
          <div key={item.key} className={itemClass} data-testid={item["data-testid"]}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
