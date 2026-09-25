import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Trophy,
} from "lucide-react";
import type { SpieleStatusMetric } from "./SpieleManagementStatusStrip";
import { cn } from "@/lib/cn";
import { SCE_KPI_CARD_SURFACE } from "@/lib/shell/sce-surface-system";

type Props = {
  metrics: SpieleStatusMetric[];
};

const ICONS: Record<string, typeof CalendarClock> = {
  anstehend: CalendarClock,
  offen: Clock3,
  bereit: CheckCircle2,
  resultate: Trophy,
};

const ICON_TILE: Record<string, string> = {
  anstehend: "bg-sky-500/15 text-sky-400",
  offen: "bg-amber-500/15 text-amber-400",
  bereit: "bg-emerald-500/15 text-emerald-400",
  resultate: "bg-[var(--surface-2)] text-[var(--muted)]",
};

export default function SpieleManagementKpiCards({ metrics }: Props) {
  return (
    <div
      className="grid grid-cols-2 gap-2 lg:grid-cols-4"
      data-testid="spiele-kpi-cards"
    >
      {metrics.map((metric) => {
        const Icon = ICONS[metric.key] ?? CalendarClock;
        const body = (
          <>
            <span
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                ICON_TILE[metric.key] ?? ICON_TILE.anstehend,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums leading-none text-[var(--foreground)]">
                {metric.value}
              </p>
              <p className="mt-1 text-xs font-medium text-[var(--foreground)]">{metric.label}</p>
              {metric.hint ? (
                <p className="text-[0.65rem] text-[var(--muted)]">{metric.hint}</p>
              ) : null}
            </div>
          </>
        );

        const className = cn(
          "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
          SCE_KPI_CARD_SURFACE,
          metric.active && "ring-1 ring-[var(--sce-primary)]/50",
          metric.href && "hover:border-[var(--border-strong)]",
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
              {body}
            </Link>
          );
        }

        return (
          <div key={metric.key} className={className} data-testid={metric["data-testid"]}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
