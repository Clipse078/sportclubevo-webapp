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
} from "./types";
export { isSceActivityPresentationModel } from "./types";

export {
  SCE_ACTIVITY_DENSITY_CONTRACT,
  mapSportingActivityDensityToSceDensity,
  type SceActivityDensityContract,
  type SceActivityDensityDimensionPolicy,
} from "./density";

export {
  formatSceActivityLocationHierarchy,
  SCE_ACTIVITY_LOCATION_HIERARCHY_SEPARATOR,
} from "./location-format";

export {
  buildSceActivityPresentationStatus,
  mapPersonalProgrammeStatusToSemantic,
  mapSpieleStatusLabelToSemantic,
} from "./status";

export { buildSceActivityRoute, parseActivityIdFromResourceKey } from "./route";

export { resolveSceMatchPresentation } from "./adapters/match";
export { resolveSceTrainingPresentationFromLegacy } from "./adapters/training";
export { resolveSceTournamentPresentation } from "./adapters/tournament";
export { resolveSceClubEventPresentationFromLegacy } from "./adapters/club-event";
export {
  mapLegacySportingActivityKindToSceKind,
  resolveSceActivityPresentationFromLegacy,
} from "./adapters/from-legacy-presentation";

export {
  assertSceActivityKind,
  resolveSceActivityPresentation,
  type SceActivityPresentationSource,
} from "./resolve";
