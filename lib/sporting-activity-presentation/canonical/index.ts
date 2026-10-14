export type {
  SceActivityKind,
  SceActivityLocation,
  SceActivityPresentationDensity,
  SceActivityPresentationModel,
  SceActivityPresentationStatus,
  SceActivityRoute,
  SceActivitySchedule,
  SceClubEventPresentationModel,
  SceMatchFixtureIdentity,
  SceMatchPresentationModel,
  SceMatchResult,
  ScePresentationStatusSemantic,
  SceTournamentPresentationModel,
  SceTrainingPresentationModel,
  SceTrainingRecurrencePresentation,
  SceTrainingSchedulePresentation,
} from "./types";
export {
  isSceActivityPresentationModel,
  isSceClubEventPresentationModel,
  isSceTrainingPresentationModel,
  isSceTournamentPresentationModel,
} from "./types";

export {
  SCE_ACTIVITY_DENSITY_CONTRACT,
  mapSportingActivityDensityToSceDensity,
  type SceActivityDensityContract,
  type SceActivityDensityDimensionPolicy,
} from "./density";

export {
  isSceActivityDimensionVisible,
  sceActivityDensityContract,
  sceActivityDimensionPolicy,
} from "./match-card-policy";

export {
  formatSceActivityLocationHierarchy,
  SCE_ACTIVITY_LOCATION_HIERARCHY_SEPARATOR,
} from "./location-format";

export {
  buildSceActivityPresentationStatus,
  mapPersonalProgrammeStatusToSemantic,
  mapScePresentationSemanticToBadgeVariant,
  mapSpieleStatusLabelToSemantic,
} from "./status";

export {
  buildSceMatchResultPerspectiveContextBadge,
  buildSceMatchTenantSideContextBadge,
  resolveSceMatchResultPerspectiveStatus,
  withSceMatchContextBadges,
} from "./match-context-badges";

export { resolveSceMatchLifecycleStatus } from "./match-lifecycle-status";

export { buildSceActivityRoute, parseActivityIdFromResourceKey } from "./route";

export { resolveSceMatchPresentation } from "./adapters/match";
export { resolveSceTrainingPresentationFromLegacy } from "./adapters/training";
export { resolveSceTrainingPresentationFromManagementRow } from "./adapters/training-management";
export { resolveSceTrainingPresentationFromWeekplannerTraining } from "./adapters/weekplanner-training";
export { resolveSceTrainingPresentationFromSessionManagementRow } from "./adapters/training-session-management";
export { resolveSceTrainingManagementStatus } from "./training-management-status";
export { resolveSceTrainingSessionDisplayStatus } from "./training-session-display-status";
export {
  SCE_TRAINING_CARD_SHELL_CLASS,
  SCE_TRAINING_RICH_DENSITY_SCALE,
  isSceTrainingRichCardDensity,
  sceTrainingCardBoundedWidthClass,
  sceTrainingRichDensityScale,
} from "./training-card-rich-density";
export { resolveSceTournamentPresentation } from "./adapters/tournament";
export { resolveSceTournamentPresentationFromWeekplannerTournament } from "./adapters/weekplanner-tournament";
export { resolveSceClubEventPresentationFromWeekplannerVeranstaltung } from "./adapters/weekplanner-veranstaltung";
export {
  SCE_TOURNAMENT_CARD_SHELL_CLASS,
  SCE_TOURNAMENT_RICH_DENSITY_SCALE,
  isSceTournamentRichCardDensity,
  sceTournamentCardBoundedWidthClass,
  sceTournamentRichDensityScale,
} from "./tournament-card-rich-density";
export {
  resolveSceClubEventPresentation,
  resolveSceClubEventPresentationFromLegacy,
} from "./adapters/club-event";
export {
  SCE_CLUB_EVENT_CARD_SHELL_CLASS,
  SCE_CLUB_EVENT_RICH_DENSITY_SCALE,
  isSceClubEventRichCardDensity,
  sceClubEventCardBoundedWidthClass,
  sceClubEventRichDensityScale,
} from "./club-event-card-rich-density";
export {
  formatSceClubEventDateLine,
  formatSceClubEventTimeLabel,
} from "./club-event-schedule-presentation";
export {
  mapClubEventLifecycleStatusToSemantic,
  resolveClubEventLifecycleStatusLabel,
  resolveClubEventPublicationPresentationLabel,
} from "./club-event-status-presentation";
export {
  mapLegacySportingActivityKindToSceKind,
  resolveSceActivityPresentationFromLegacy,
} from "./adapters/from-legacy-presentation";

export {
  assertSceActivityKind,
  resolveSceActivityPresentation,
  type SceActivityPresentationSource,
} from "./resolve";
