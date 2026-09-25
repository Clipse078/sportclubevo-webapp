/**
 * Canonical publication defaults for TOURNAMENT events at creation time.
 *
 * All supported tournament publication channels default to ON unless the client
 * sends an explicit value in the create payload.
 */

export type TournamentPublicationDefaults = {
  websiteVisible: boolean;
  infoboardVisible: boolean;
  homepageVisible: boolean;
  wochenplanVisible: boolean;
  teamPageVisible: boolean;
};

export function resolveTournamentPublicationDefaultsForCreate(): TournamentPublicationDefaults {
  return {
    websiteVisible: true,
    infoboardVisible: true,
    homepageVisible: true,
    wochenplanVisible: true,
    teamPageVisible: true,
  };
}
