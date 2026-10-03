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
import { ActivityContextBadge } from "./ActivityContextBadge";

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
  const contextIndicator = typeLine?.contextIndicator;
  const showContextBesidePrimary = Boolean(!showTypeLine && showPrimary && contextIndicator);
  const showContextOnlyRow = Boolean(!showTypeLine && !showPrimary && contextIndicator);

  return (
    <div className={cn("min-w-0", className)} data-testid="sporting-activity-identity">
      {showPrimary ? (
        <p
          className={cn(
            "flex flex-wrap items-center gap-x-1.5 gap-y-0.5",
            wrapPrimary
              ? "text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)]"
              : "text-[0.9375rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]",
            primaryClassName,
          )}
        >
          <span className={cn(wrapPrimary ? "line-clamp-2 min-w-0 flex-1 basis-full sm:basis-auto" : "truncate")}>
            {primaryText}
          </span>
          {showContextBesidePrimary ? (
            <ActivityContextBadge>{contextIndicator}</ActivityContextBadge>
          ) : null}
        </p>
      ) : null}
      {typeLine && showTypeLine ? (
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
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
          {contextIndicator ? <ActivityContextBadge>{contextIndicator}</ActivityContextBadge> : null}
        </p>
      ) : null}
      {showContextOnlyRow ? (
        <p className="mt-0.5">
          <ActivityContextBadge>{contextIndicator}</ActivityContextBadge>
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
