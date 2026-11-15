import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GoalSceIcon } from "@/components/icons/domain-sce-icon-components";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";
import { formatLinkedInitiativeCount } from "@/lib/club-development/product-copy";
import {
  buildVorhabenUndUmsetzungHref,
  CD_WORKSPACE_PRIORITAETEN_QUERY,
} from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import { CD_STRATEGY_PROGRESS_COPY } from "@/lib/club-development/strategy-progress-presentation";
import { formatTargetStatusLabel } from "@/lib/targets/target-presentation";
import StrategyProgressIndicator from "./StrategyProgressIndicator";

type StrategyOverviewPanelProps = {
  targets: StrategyTargetOverview[];
  canManageTargets?: boolean;
  focusTargetIds?: ReadonlySet<string>;
};

function formatPercent(value: number | null, emptyLabel = "—") {
  if (value == null) return emptyLabel;
  return `${value}%`;
}

export default function StrategyOverviewPanel({
  targets,
  canManageTargets = false,
  focusTargetIds,
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
      {targets.map((target) => {
        const isFocus = focusTargetIds?.has(target.id) ?? false;
        return (
          <article
            key={target.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:border-[var(--sce-primary)]/30"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <GoalSceIcon className="h-4 w-4 shrink-0 text-[var(--sce-primary)]" aria-hidden />
                  <h2 className="text-base font-semibold text-[var(--foreground)]">{target.title}</h2>
                  {isFocus ? (
                    <span className="rounded-full border border-[var(--sce-primary)]/30 bg-[var(--sce-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--sce-primary)]">
                      {CD_STRATEGY_PROGRESS_COPY.focusBadge}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-[var(--muted)]">
                  Zielstatus: {formatTargetStatusLabel(target.status)} ·{" "}
                  {formatLinkedInitiativeCount(target.linkedInitiativeCount)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link
                  href={`/vereinsleitung/targets/${target.id}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--sce-primary)] hover:bg-[var(--surface)]"
                >
                  Zieldetails
                  <ArrowRight className="h-3 w-3" />
                </Link>
                {target.linkedInitiativeCount > 0 ? (
                  <Link
                    href={buildVorhabenUndUmsetzungHref("vorhaben", {
                      targetId: target.id,
                      [CD_WORKSPACE_PRIORITAETEN_QUERY]: "1",
                    })}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--sce-primary)] hover:bg-[var(--surface)]"
                  >
                    Vorhaben & Umsetzung
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <StrategyProgressIndicator
                testId="strategy-outcome-progress"
                label={CD_STRATEGY_PROGRESS_COPY.outcomeLabel}
                percent={target.outcomeProgressPercent}
                unknownReason={target.outcomeProgressUnknownReason}
              />
              <StrategyProgressIndicator
                testId="strategy-delivery-progress"
                label={CD_STRATEGY_PROGRESS_COPY.deliveryLabel}
                percent={target.deliveryProgressPercent}
                unknownReason={target.deliveryProgressUnknownReason}
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
        );
      })}
    </div>
  );
}