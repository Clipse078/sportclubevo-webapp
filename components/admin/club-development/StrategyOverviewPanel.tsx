import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GoalSceIcon } from "@/components/icons/domain-sce-icon-components";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";

type StrategyOverviewPanelProps = {
  targets: StrategyTargetOverview[];
  canManageTargets?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  DRAFT: "Entwurf",
  PAUSED: "Pausiert",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgebrochen",
};

function formatPercent(value: number | null, emptyLabel = "—") {
  if (value == null) return emptyLabel;
  return `${value}%`;
}

function ProgressBar({
  label,
  percent,
  accentClass = "bg-[var(--sce-primary)]",
}: {
  label: string;
  percent: number | null;
  accentClass?: string;
}) {
  const width = percent != null ? Math.min(100, Math.max(0, percent)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--text-2)]">{label}</span>
        <span className="text-xs font-semibold text-[var(--foreground)]">{formatPercent(percent)}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-2)]">
        <div className={`h-2 rounded-full ${accentClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function StrategyOverviewPanel({
  targets,
  canManageTargets = false,
}: StrategyOverviewPanelProps) {
  if (targets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-10 text-center text-sm text-[var(--muted)]">
        {canManageTargets
          ? "Noch keine Ziele in der Übersicht — nutzen Sie «Strategisches Ziel erfassen»."
          : "Keine strategischen Ziele sichtbar."}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="strategy-overview-panel">
      {targets.map((target) => (
        <article
          key={target.id}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:border-[var(--sce-primary)]/30"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <GoalSceIcon className="h-4 w-4 shrink-0 text-[var(--sce-primary)]" aria-hidden />
                <h2 className="text-base font-semibold text-[var(--foreground)]">{target.title}</h2>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Status: {STATUS_LABELS[target.status] ?? target.status} · {target.linkedInitiativeCount}{" "}
                verknüpfte Initiative{target.linkedInitiativeCount === 1 ? "" : "n"}
              </p>
            </div>
            <Link
              href={`/vereinsleitung/targets/${target.id}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--sce-primary)] hover:bg-[var(--surface)]"
            >
              Zieldetails
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ProgressBar label="Zielerreichung (Outcome)" percent={target.outcomeProgressPercent} />
            <ProgressBar
              label="Umsetzungsfortschritt (Delivery)"
              percent={target.deliveryProgressPercent}
              accentClass="bg-[var(--sce-info)]"
            />
          </div>

          {target.metrics.length > 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-2)]/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Kennzahlen
              </p>
              <ul className="space-y-2">
                {target.metrics.map((metric) => (
                  <li
                    key={metric.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--text-2)]"
                  >
                    <span>{metric.label}</span>
                    <span className="text-xs tabular-nums text-[var(--foreground)]">
                      {metric.currentValue} / {metric.targetValue} · {formatPercent(metric.outcomePercent)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
