/**
 * SCE Tournament Planner — tenant-organiser eligibility (01E1).
 *
 * Planner ownership follows tournament organiser identity, not physical venue.
 * In SCE, `Event.homeAway` for type=TOURNAMENT encodes organiser ownership:
 * - HOME → tenant organises (Eigenes Turnier) → planner allowed
 * - AWAY → external organiser (Auswärtsturnier) → planner forbidden for tenant
 *
 * Unknown / unset `homeAway` does NOT grant planner authority by default.
 * Legacy rows may only plan when explicit HOME or persisted organiser data
 * proves the tenant is organiser (organizerName matches tenant club name).
 */

import { normalizeClubNameForLookup } from "@/lib/club-directory/club-name-normalization";
import type { TournamentHomeAway } from "@/lib/tournaments/types";

export type TournamentPlannerOwnershipInput = {
  /** Raw `Event.homeAway` from persistence (not DTO-normalised). */
  homeAway: string | null | undefined;
  organizerName?: string | null;
  tenantName?: string | null;
};

export type TournamentPlannerOwnershipResolution =
  | "TENANT_ORGANISED"
  | "EXTERNALLY_ORGANISED"
  | "UNKNOWN";

function isExplicitAway(homeAway: string | null | undefined): boolean {
  const normalized = homeAway?.trim().toUpperCase();
  return normalized === "AWAY" || normalized === "A";
}

function isExplicitHome(homeAway: string | null | undefined): boolean {
  const normalized = homeAway?.trim().toUpperCase();
  return normalized === "HOME" || normalized === "H";
}

function organizerNameProvesTenantOrganiser(
  organizerName: string | null | undefined,
  tenantName: string | null | undefined,
): boolean {
  const organiser = organizerName?.trim();
  const tenant = tenantName?.trim();
  if (!organiser || !tenant) return false;
  return normalizeClubNameForLookup(organiser) === normalizeClubNameForLookup(tenant);
}

/** Deterministic organiser ownership for Tournament Planner (conservative). */
export function resolveTournamentPlannerOwnership(
  input: TournamentPlannerOwnershipInput,
): TournamentPlannerOwnershipResolution {
  if (isExplicitAway(input.homeAway)) {
    return "EXTERNALLY_ORGANISED";
  }
  if (isExplicitHome(input.homeAway)) {
    return "TENANT_ORGANISED";
  }
  if (organizerNameProvesTenantOrganiser(input.organizerName, input.tenantName)) {
    return "TENANT_ORGANISED";
  }
  return "UNKNOWN";
}

/** Authoritative resolver for Tournament Planner eligibility. */
export function canTenantPlanTournament(input: TournamentPlannerOwnershipInput): boolean {
  return resolveTournamentPlannerOwnership(input) === "TENANT_ORGANISED";
}

/**
 * DTO / presentation normalisation (MatchCenter convention).
 * NOT used for Tournament Planner authorization — see `canTenantPlanTournament`.
 */
export function normalizeTournamentOrganiserHomeAway(
  homeAway: string | null | undefined,
): TournamentHomeAway {
  return homeAway?.trim().toUpperCase() === "AWAY" ? "AWAY" : "HOME";
}
