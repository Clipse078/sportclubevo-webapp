/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01B-R3 — deep links for roster onboarding CTAs.
 * Kader / Trainerteam live on dedicated cockpit routes (not team overview).
 */

export function teamSquadOnboardingHref(teamId: string): string {
  return `/dashboard/teams/${teamId}/kader#spielerkader`;
}

export function teamTrainerOnboardingHref(teamId: string): string {
  return `/dashboard/teams/${teamId}/trainerteam#trainerteam`;
}
