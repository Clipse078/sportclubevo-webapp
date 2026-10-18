/**
 * Publication management ownership — tenant-organised tournaments only (01K).
 */

import {
  canTenantPlanTournament,
  resolveTournamentPlannerOwnership,
  type TournamentPlannerOwnershipResolution,
} from "@/lib/tournament-scheduling/planner-eligibility";

export type TournamentPublicationManagementInput = {
  homeAway: string | null | undefined;
  organizerName?: string | null;
  tenantName?: string | null;
};

export type TournamentPublicationManagementDecision =
  | { allowed: true; ownership: TournamentPlannerOwnershipResolution }
  | { allowed: false; ownership: TournamentPlannerOwnershipResolution; code: string };

export function resolveTournamentPublicationManagement(
  input: TournamentPublicationManagementInput,
): TournamentPublicationManagementDecision {
  const ownership = resolveTournamentPlannerOwnership(input);
  if (ownership === "EXTERNALLY_ORGANISED") {
    return {
      allowed: false,
      ownership,
      code: "TOURNAMENT_PUBLICATION_EXTERNALLY_ORGANISED",
    };
  }
  if (!canTenantPlanTournament(input)) {
    return {
      allowed: false,
      ownership,
      code: "TOURNAMENT_PUBLICATION_OWNERSHIP_UNKNOWN",
    };
  }
  return { allowed: true, ownership };
}

export function publicationPatchTouchesManagement(
  input: Record<string, unknown>,
): boolean {
  const keys = [
    "websiteVisible",
    "infoboardVisible",
    "homepageVisible",
    "wochenplanVisible",
    "teamPageVisible",
  ] as const;
  return keys.some((key) => input[key] !== undefined);
}
