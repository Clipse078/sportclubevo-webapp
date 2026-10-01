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
  applyPresentationToProgrammeFields,
  buildGenericSportingEventPresentation,
  buildMatchActivityPresentation,
  buildTournamentActivityPresentation,
  buildTrainingActivityPresentation,
} from "./builders";

export { loadTrainingSessionFacilityHints } from "./training-facility-batch";
