"use client";

import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";
import { GoalSceIcon } from "@/components/icons/domain-sce-icon-components";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";
import { formatLinkedInitiativeCount } from "@/lib/club-development/product-copy";
import { CD_STRATEGY_PROGRESS_COPY } from "@/lib/club-development/strategy-progress-copy";
import { formatTargetStatusLabel } from "@/lib/targets/target-presentation";
import StrategyProgressIndicator from "@/components/admin/club-development/StrategyProgressIndicator";
import {
  buildVorhabenUndUmsetzungHref,
  CD_WORKSPACE_PRIORITAETEN_QUERY,
} from "@/lib/club-development/vereinsentwicklung-workspace-routing";

type Props = {
  target: StrategyTargetOverview;
  isFocus?: boolean;
};

function formatPercent(value: number | null, emptyLabel = "—") {
  if (value == null) return emptyLabel;
  return `${value}%`;
}

export default function TargetZieleCollapsibleCard({ target, isFocus = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const panelId = `target-ziele-panel-${target.id}`;

  return (
    <article
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
      data-testid={`target-ziele-collapsible-${target.id}`}
      data-expanded={expanded ? "true" : "false"}
    >
      <div className="flex items-start gap-2 px-4 py-3">
        <button
          type="button"
          className="mt-0.5 rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={expanded ? "Ziel einklappen" : "Ziel ausklappen"}
          onClick={() => setExpanded(!expanded)}
          data-testid={`target-ziele-toggle-${target.id}`}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        <div className="min-w-0 flex-1">
          <ZieleCardTitle target={target} isFocus={isFocus} />
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Zielstatus: {formatTargetStatusLabel(target.status)} · Zielerreichung:{" "}
            {formatPercent(target.outcomeProgressPercent)} · Umsetzung:{" "}
            {formatPercent(target.deliveryProgressPercent)}
          </p>
        </div>
      </div>

      <div id={panelId} hidden={!expanded} className="border-t border-[var(--border)] p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <StrategyProgressIndicator
            label={CD_STRATEGY_PROGRESS_COPY.outcomeLabel}
            percent={target.outcomeProgressPercent}
            unknownReason={target.outcomeProgressUnknownReason}
          />
          <StrategyProgressIndicator
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
        {target.linkedInitiativeCount > 0 ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            {formatLinkedInitiativeCount(target.linkedInitiativeCount)} —{" "}
            <Link
              href={buildVorhabenUndUmsetzungHref("vorhaben", {
                targetId: target.id,
                [CD_WORKSPACE_PRIORITAETEN_QUERY]: "1",
              })}
              className="font-medium text-[var(--sce-primary)] hover:underline"
            >
              In Vorhaben & Umsetzung anzeigen
            </Link>
          </p>
        ) : null}
        <div className="mt-4">
          <Link
            href={`/vereinsleitung/targets/${target.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--sce-primary)]"
            data-testid={`target-ziele-detail-${target.id}`}
          >
            Detailseite öffnen
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

function ZieleCardTitle({
  target,
  isFocus,
}: {
  target: StrategyTargetOverview;
  isFocus: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <GoalSceIcon className="h-4 w-4 shrink-0 text-[var(--sce-primary)]" aria-hidden />
      <Link
        href={`/vereinsleitung/targets/${target.id}`}
        className="text-base font-semibold text-[var(--foreground)] hover:text-[var(--sce-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {target.title}
      </Link>
      {isFocus ? (
        <span className="rounded-full border border-[var(--sce-primary)]/30 bg-[var(--sce-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--sce-primary)]">
          {CD_STRATEGY_PROGRESS_COPY.focusBadge}
        </span>
      ) : null}
    </div>
  );
}