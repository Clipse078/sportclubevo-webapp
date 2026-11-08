/**
 * SCE-DS2-04 — Premium activity cards (White Edition sporting surfaces).
 * @see docs/design-system-v2/12-ds2-04-activity-cards-delivery.md
 */

export const SCE_DS2_04_PACKAGE_KEY = "SCE-DS2-04" as const;

export const SCE_DS2_04_PREDECESSOR = "SCE-DS2-03" as const;

export const SCE_DS2_04_DOC_MARKERS = [
  "SCE-DS2-04",
  "sce-activity-card-shell",
  "SCE_ACTIVITY_CARD_SHELL_CLASS",
  "activity-card-shell-contract",
  "docs/design-system-v2/12-ds2-04-activity-cards-delivery.md",
] as const;

export const SCE_DS2_04_CARD_FAMILIES = [
  "SceMatchCard",
  "SceTrainingCard",
  "SceTournamentCard",
  "SceClubEventCard",
] as const;

export const SCE_DS2_04_EXCLUSIONS = [
  "Infoboard / venue display card chrome",
  "DS2-05 dense workspace primitives",
  "DS2-06 module sweeps",
  "Scheduling / permissions / API behaviour",
] as const;
