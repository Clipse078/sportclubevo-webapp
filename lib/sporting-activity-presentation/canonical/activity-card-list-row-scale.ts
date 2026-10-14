import { cn } from "@/lib/cn";
import {
  SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS,
  SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
  SCE_ACTIVITY_TEAM_CONTEXT_FOREGROUND_CLASS,
} from "./activity-card-semantic-tokens";

/** Shared MICRO / planner-list-row typography — one grammar across World Activity Cards. */
export const SCE_ACTIVITY_LIST_ROW_SCALE = {
  identityStackClass: "space-y-0.5",
  metaRowClass: "flex min-w-0 items-center gap-2",
  primaryTitleClass: cn(
    "min-w-0 line-clamp-2 text-[0.9375rem] font-semibold leading-snug",
    SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  ),
  secondaryContextClass: cn(
    "min-w-0 truncate text-[0.8125rem] font-medium leading-snug",
    SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
  ),
  teamContextClass: cn(
    "min-w-0 truncate text-[0.8125rem] font-medium leading-snug",
    SCE_ACTIVITY_TEAM_CONTEXT_FOREGROUND_CLASS,
  ),
  fixtureClubNameClass: cn(
    "min-w-0 truncate text-[0.8125rem] font-semibold leading-snug",
    SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  ),
  fixtureVsClass: cn(
    "shrink-0 px-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em]",
    SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS,
  ),
  /** Canonical MICRO / Wochenplaner list-row crest bounding box (~36px). */
  crestBoundsClass: "h-9 w-9",
  fixtureGridClass:
    "grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5",
  /** Programme list — tighter fixture band, larger crests (~44–48px). */
  programmeMatchCrestBoundsClass: "h-11 w-11 sm:h-12 sm:w-12",
  programmeFixtureGridClass:
    "grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-1.5 gap-y-0",
  programmeFixtureKickoffClass:
    "font-mono text-sm font-bold tabular-nums leading-none text-[var(--foreground)]",
  programmeFixtureVsClass: cn(
    "text-[0.5rem] font-semibold uppercase tracking-[0.14em]",
    SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS,
  ),
  programmeCompetitionClass: cn(
    "min-w-0 truncate text-[0.6875rem] font-medium",
    SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
  ),
  programmeLocationClass: cn(
    "min-w-0 truncate text-[0.6875rem]",
    SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
  ),
} as const;

export function sceActivityListRowTypePillClass(): string {
  return "text-[0.625rem] px-1.5 py-px leading-none";
}
