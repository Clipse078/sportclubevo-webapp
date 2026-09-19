import Link from "next/link";
import { cn } from "@/lib/cn";

export type SpieleStatusMetric = {
  key: string;
  label: string;
  value: number;
  hint?: string;
  href?: string;
  active?: boolean;
  tone?: "default" | "amber" | "emerald" | "muted";
  "data-testid"?: string;
};

type Props = {
  metrics: SpieleStatusMetric[];
};

const toneClass: Record<NonNullable<SpieleStatusMetric["tone"]>, string> = {
  default: "text-[var(--foreground)]",
  amber: "text-amber-700",
  emerald: "text-emerald-700",
  muted: "text-[var(--muted)]",
};

export default function SpieleManagementStatusStrip({ metrics }: Props) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-[var(--border)]/60 py-2.5"
      data-testid="spiele-status-strip"
    >
      {metrics.map((metric) => {
        const content = (
          <>
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              {metric.label}
            </span>
            <span
              className={cn(
                "text-base font-semibold tabular-nums leading-none",
                toneClass[metric.tone ?? "default"],
              )}
            >
              {metric.value}
            </span>
          </>
        );

        const className = cn(
          "inline-flex items-baseline gap-2 transition-opacity",
          metric.href && "hover:opacity-90",
          metric.active && "rounded-md bg-[var(--surface-2)]/80 px-2 py-1",
        );

        if (metric.href) {
          return (
            <Link
              key={metric.key}
              href={metric.href}
              className={className}
              data-testid={metric["data-testid"]}
              aria-current={metric.active ? "true" : undefined}
            >
              {content}
            </Link>
          );
        }

        return (
          <div key={metric.key} className={className} data-testid={metric["data-testid"]}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
