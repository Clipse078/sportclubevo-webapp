export type {
  SportingActivityKind,
  SportingActivityLocation,
  SportingActivityPresentation,
  SportingActivityPresentationDensity,
  SportingLocationMode,
} from "./types";

export {
  buildSportingActivityLocation,
  formatSportingActivityLocationLines,
  formatSportingActivityLocationSummary,
  normalizeSportingLocationMode,
} from "./location";

export {
  formatSportingActivityCompactContextLine,
  formatSportingActivityCompactTitle,
  formatSportingActivityPresentation,
  formatSportingActivityScheduleLine,
  formatSportingActivityStandardSecondaryLines,
} from "./format";

export {
  collectCompactPrimaryCoverageKeys,
  filterCompactMetadataPartsAgainstPrimary,
} from "./compact-dedupe";

export {
  formatSportingActivityCompactAgendaClubLocationLine,
  formatSportingActivityCompactAgendaContextIndicator,
  formatSportingActivityCompactAgendaLocationParts,
  formatSportingActivityCompactAgendaSecondaryLine,
  formatSportingActivityCompactPrimaryText,
  formatSportingActivityLocationModeCompactLabel,
  resolveSportingActivityCompactAgendaTypeLine,
  resolveSportingActivityCompactPresentation,
  type SportingActivityCompactAgendaTypeLine,
  type SportingActivityCompactFormatOptions,
  type SportingActivityCompactPresentation,
} from "./compact";

export {
  applyPresentationToProgrammeFields,
  buildGenericSportingEventPresentation,
  buildMatchActivityPresentation,
  buildTournamentActivityPresentation,
  buildTrainingActivityPresentation,
} from "./builders";

export { loadTrainingSessionFacilityHints } from "./training-facility-batch";

export { buildTrainingManagementActivityPresentation } from "./management-adapters";

export {
  assertSceActivityKind,
  buildSceActivityPresentationStatus,
  buildSceActivityRoute,
  formatSceActivityLocationHierarchy,
  isSceActivityPresentationModel,
  mapLegacySportingActivityKindToSceKind,
  mapPersonalProgrammeStatusToSemantic,
  mapSportingActivityDensityToSceDensity,
  parseActivityIdFromResourceKey,
  resolveSceActivityPresentation,
  resolveSceActivityPresentationFromLegacy,
  resolveSceMatchPresentation,
  resolveSceTournamentPresentation,
  resolveSceTrainingPresentationFromLegacy,
  SCE_ACTIVITY_DENSITY_CONTRACT,
  SCE_ACTIVITY_LOCATION_HIERARCHY_SEPARATOR,
  type SceActivityKind,
  type SceActivityPresentationDensity,
  type SceActivityPresentationModel,
  type SceActivityPresentationSource,
  type SceActivityRoute,
} from "./canonical";
