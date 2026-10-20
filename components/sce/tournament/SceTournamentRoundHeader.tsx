"use client";

import { Layers2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { SCE_TOURNAMENT_ROUND_COUNT_BADGE_CLASS } from "@/lib/sce/tournament/sce-tournament-surface-layout";

type Props = {
  headingId: string;
  title: string;
  metaLine?: string | null;
  countLabel?: string | null;
  testId?: string;
  className?: string;
};

/** Shared round hierarchy for Composer and Master Spielplan surfaces. */
export default function SceTournamentRoundHeader({
  headingId,
  title,
  metaLine = null,
  countLabel = null,
  testId,
  className,
}: Props) {
  return (
    <header
      className={cn(
        "mb-4 flex flex-wrap items-start justify-between gap-3",
        "border-b border-[var(--sce-surface-border-subtle)] pb-3",
        className,
      )}
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-1 gap-2.5">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--sce-surface-border-subtle)] bg-[var(--sce-surface-elevated)]/55 text-[var(--sce-primary)]"
          aria-hidden
          data-testid="sce-tournament-round-icon"
        >
          <Layers2 className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 space-y-0.5">
          <h4
            id={headingId}
            className="text-base font-semibold tracking-tight text-[var(--foreground)]"
          >
            {title}
          </h4>
          {metaLine ? (
            <p className="text-sm text-[var(--text-2)]" data-testid="sce-tournament-round-meta">
              {metaLine}
            </p>
          ) : null}
        </div>
      </div>
      {countLabel ? (
        <span className={SCE_TOURNAMENT_ROUND_COUNT_BADGE_CLASS}>{countLabel}</span>
      ) : null}
    </header>
  );
}
