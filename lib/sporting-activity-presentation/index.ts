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
