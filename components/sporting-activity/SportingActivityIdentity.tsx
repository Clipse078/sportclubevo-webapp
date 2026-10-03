"use client";

import { cn } from "@/lib/cn";
import {
  formatSportingActivityCompactAgendaClubLocationLine,
  formatSportingActivityCompactPrimaryText,
  resolveSportingActivityCompactAgendaTypeLine,
} from "@/lib/sporting-activity-presentation/compact";
import {
  resolveSportingActivityTypePillVariant,
  sportingActivityTypePillClassName,
} from "@/lib/sporting-activity-presentation/activity-type-pill";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";

export type SportingActivityIdentityMode = "compact" | "management";

export type SportingActivityIdentityProps = {
  presentation: SportingActivityPresentation;
  mode?: SportingActivityIdentityMode;
  className?: string;
  primaryClassName?: string;
  /** When true, primary line may wrap (dashboard agenda). When false, truncates (management tables). */
  primaryWrap?: boolean;
  /** When false, type pill is omitted (shown on meta rail instead). Context badge remains in body. */
  showTypeLine?: boolean;
  showPrimary?: boolean;
  showClubLocationLine?: boolean;
};

const MEIN_PROGRAMM_CONTRACT = { meinProgrammContract: true as const };

/**
 * Canonical three-line sporting activity identity (primary, type + context, club/host - location).
 */
export function SportingActivityIdentity({
  presentation,
  mode = "management",
  className,
  primaryClassName,
  primaryWrap,
  showTypeLine = true,
  showPrimary = true,
  showClubLocationLine = true,
}: SportingActivityIdentityProps) {
  const primaryText = formatSportingActivityCompactPrimaryText(presentation);
  const typeLine = resolveSportingActivityCompactAgendaTypeLine(
    presentation,
    MEIN_PROGRAMM_CONTRACT,
  );
  const clubLocationLine = formatSportingActivityCompactAgendaClubLocationLine(
    presentation,
    MEIN_PROGRAMM_CONTRACT,
  );
  const typePillVariant = resolveSportingActivityTypePillVariant(
    presentation.identity.activityKind,
  );

  const wrapPrimary =
    primaryWrap ?? mode === "compact";

  return (
    <div className={cn("min-w-0", className)} data-testid="sporting-activity-identity">
      {showPrimary ? (
        <p
          className={cn(
            wrapPrimary
              ? "line-clamp-2 text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)]"
              : "truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]",
            primaryClassName,
          )}
        >
          {primaryText}
        </p>
      ) : null}
      {typeLine && (showTypeLine || typeLine.contextIndicator) ? (
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {showTypeLine ? (
            <span
              className={
                typePillVariant
                  ? sportingActivityTypePillClassName(typePillVariant)
                  : "inline-block text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]"
              }
              data-activity-type-pill={typePillVariant ?? undefined}
            >
              {typeLine.typeLabel}
            </span>
          ) : null}
          {typeLine.contextIndicator ? (
            <span
              className="inline-block rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-medium normal-case tracking-normal text-[var(--text-2)]"
              data-activity-context-badge
            >
              {typeLine.contextIndicator}
            </span>
          ) : null}
        </p>
      ) : null}
      {showClubLocationLine && clubLocationLine ? (
        <p
          className={cn(
            "mt-0.5 text-[0.8125rem] leading-snug text-[var(--text-2)]",
            wrapPrimary ? "line-clamp-2" : "truncate",
          )}
        >
          {clubLocationLine}
        </p>
      ) : null}
    </div>
  );
}
