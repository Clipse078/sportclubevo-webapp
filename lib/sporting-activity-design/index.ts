export type {
  ClubIdentity,
  ClubIdentityFallback,
  ClubIdentityFallbackKind,
  BuildClubIdentityInput,
} from "./club-identity";
export {
  buildClubIdentity,
  resolveClubIdentityEffectiveLogoUrl,
} from "./club-identity";

export { deriveClubIdentityFallbackLabel } from "./fallback-label";

export {
  resolveMatchSideClubLogoUrl,
  resolveTournamentOrganiserClubLogoUrl,
} from "./logo-resolution";

export { buildClubIdentityFromMatchSide } from "./match-side-club-identity";

export type { MatchClubIdentityPair } from "./match-identity";
export { buildMatchClubIdentityPair } from "./match-identity";

export {
  buildNameOnlyClubIdentity,
  buildTournamentOrganiserClubIdentity,
} from "./tournament-organiser-identity";

export type { SportingActivityDensity } from "./density";
export {
  clubCrestSizeForDensity,
  mapSportingActivityDensityToPresentationDensity,
} from "./density";

export {
  SPORTING_ACTIVITY_COLOR_BY_KIND,
  resolveSportingActivityColorToken,
  sportingActivityColorClassName,
  type SportingActivityTypePillVariantKey,
} from "./activity-color-tokens";
