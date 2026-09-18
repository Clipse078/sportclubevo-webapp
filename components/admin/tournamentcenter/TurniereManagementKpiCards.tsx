import Link from "next/link";
import { CalendarClock, History, MapPin, Trophy } from "lucide-react";
import type { TurniereManagementKpis } from "@/lib/tournaments/management-view";
import { cn } from "@/lib/cn";

type Metric = {
  key: string;
  label: string;
  value: number;
  hint: string;
  href?: string;
  active?: boolean;
  icon: typeof CalendarClock;
  surface: string;
  iconTile: string;
  "data-testid"?: string;
};

type Props = {
  kpis: TurniereManagementKpis;
  anstehendHref: string;
  vergangenHref: string;
  scope: "UPCOMING" | "PAST" | "ALL";
};

export default function TurniereManagementKpiCards({
  kpis,
  anstehendHref,
  vergangenHref,
  scope,
}: Props) {
  const metrics: Metric[] = [
    {
      key: "anstehend",
      label: "Anstehend",
      value: kpis.upcoming,
      hint: "nächste 3 Monate",
      href: anstehendHref,
      active: scope === "UPCOMING",
      icon: CalendarClock,
      surface: "border-sky-500/25 bg-sky-950/40",
      iconTile: "bg-sky-500/15 text-sky-400",
      "data-testid": "turniere-kpi-anstehend",
    },
    {
      key: "vergangen",
      label: "Vergangen",
      value: kpis.past,
      hint: "Archiv & abgeschlossen",
      href: vergangenHref,
      active: scope === "PAST",
      icon: History,
      surface: "border-[var(--border)] bg-[var(--surface)]/80",
      iconTile: "bg-[var(--surface-2)] text-[var(--muted)]",
      "data-testid": "turniere-kpi-vergangen",
    },
    {
      key: "total",
      label: "Total",
      value: kpis.total,
      hint: "alle Turniere",
      icon: Trophy,
      surface: "border-emerald-500/25 bg-emerald-950/35",
      iconTile: "bg-emerald-500/15 text-emerald-400",
      "data-testid": "turniere-kpi-total",
    },
    {
      key: "venues",
      label: "Verschiedene Orte",
      value: kpis.uniqueVenues,
      hint: "mit Standortangabe",
      icon: MapPin,
      surface: "border-[var(--border)] bg-[var(--surface)]/80",
      iconTile: "bg-[var(--surface-2)] text-[var(--muted)]",
      "data-testid": "turniere-kpi-venues",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" data-testid="turniere-kpi-cards">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const body = (
          <>
            <span
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                metric.iconTile,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums leading-none text-[var(--foreground)]">
                {metric.value}
              </p>
              <p className="mt-1 text-xs font-medium text-[var(--foreground)]">{metric.label}</p>
              <p className="text-[0.65rem] text-[var(--muted)]">{metric.hint}</p>
            </div>
          </>
        );

        const className = cn(
          "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
          metric.surface,
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
