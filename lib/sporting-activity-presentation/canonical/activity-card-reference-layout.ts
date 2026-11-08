import { cn } from "@/lib/cn";
import {
  SCE_ACTIVITY_LOCATION_FOREGROUND_CLASS,
  SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS,
  SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
  SCE_ACTIVITY_TEAM_CONTEXT_FOREGROUND_CLASS,
} from "./activity-card-semantic-tokens";

/** FC Allschwil reference card — split meta column + horizontal matchup (DS2-04 R1 / R2 full-width). */
export const SCE_ACTIVITY_REFERENCE_LAYOUT = {
  rootClass:
    "flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4 md:gap-5 lg:gap-6",
  metaColumnClass:
    "flex min-w-0 shrink-0 flex-col justify-center gap-1 sm:basis-[32%] sm:max-w-[18rem] lg:max-w-[20rem]",
  matchupColumnClass: "flex min-w-0 flex-1 flex-col justify-center",
  fixtureGridClass:
    "grid min-w-0 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 sm:gap-x-3",
  datePrimaryClass: cn(
    "text-base font-semibold leading-tight tabular-nums sm:text-lg",
    SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  ),
  dateWeekdayClass: cn(
    "text-[0.8125rem] font-medium leading-snug",
    SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS,
  ),
  metaLineClass: cn(
    "min-w-0 text-[0.8125rem] font-medium leading-snug",
    SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
  ),
  metaLocationClass: cn(
    "min-w-0 text-[0.8125rem] leading-snug",
    SCE_ACTIVITY_LOCATION_FOREGROUND_CLASS,
  ),
  teamContextClass: cn(
    "min-w-0 text-[0.75rem] font-medium leading-snug",
    SCE_ACTIVITY_TEAM_CONTEXT_FOREGROUND_CLASS,
  ),
  programmeFixtureSideHomeClass:
    "flex min-w-0 flex-1 items-center justify-end gap-2 text-right",
  programmeFixtureSideAwayClass:
    "flex min-w-0 flex-1 items-center justify-start gap-2 text-left",
  programmeMatchCrestBoundsClass: "h-11 w-11 sm:h-12 sm:w-12",
  scoreBoxGridClass: "inline-flex items-center gap-1.5 sm:gap-2",
  scoreBoxClass:
    "sce-match-score-box inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-[var(--sce-color-border-strong)] bg-[var(--sce-color-surface-standard)] px-1.5 text-lg font-bold tabular-nums leading-none text-[var(--sce-match-result-foreground)] shadow-sm sm:h-10 sm:min-w-[2.5rem] sm:text-xl",
  scoreSeparatorClass:
    "text-sm font-semibold tabular-nums text-[var(--sce-match-result-foreground)]",
  kickoffBoxClass:
    "sce-match-kickoff-box inline-flex items-center gap-1.5 rounded-lg border border-[var(--sce-color-border-standard)] bg-[var(--sce-color-surface-standard)] px-2.5 py-1.5 font-mono text-sm font-bold tabular-nums leading-none text-[var(--sce-color-text-primary)] shadow-sm",
  kickoffIconClass: "h-3.5 w-3.5 shrink-0 text-[var(--sce-color-text-secondary)]",
  trainingReferenceRowClass:
    "sce-activity-horizontal-operational-row flex min-w-0 w-full flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,6.5rem)_minmax(0,5.5rem)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-x-3 sm:gap-y-1",
  trainingReferenceTimeClass:
    "font-mono text-sm font-semibold tabular-nums text-[var(--sce-color-text-primary)]",
  trainingReferenceTitleClass: cn(
    "min-w-0 text-[0.9375rem] font-semibold leading-snug",
    SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  ),
  trainingReferenceMetaClass: cn(
    "min-w-0 text-[0.8125rem] leading-snug break-words",
    SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
  ),
  trainingReferenceDateClass: cn(
    "text-[0.8125rem] font-semibold leading-snug tabular-nums",
    SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  ),
  horizontalOperationalDateClass: cn(
    "text-[0.8125rem] font-semibold leading-snug tabular-nums",
    SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  ),
  horizontalOperationalWrapMetaClass: cn(
    "min-w-0 text-[0.8125rem] leading-snug break-words",
    SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
  ),
} as const;
