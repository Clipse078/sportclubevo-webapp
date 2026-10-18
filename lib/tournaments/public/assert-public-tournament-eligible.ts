/**
 * Fail-closed gate for public tournament detail (API + page).
 */

import { evaluatePublication } from "@/lib/publishing/policy/publication-policy";

export type PublicTournamentEligibilityInput = {
  tenantId: string;
  event: {
    id: string;
    tenantId: string | null;
    type: string;
    status: string;
    reviewStage: string;
    websiteVisible: boolean;
    infoboardVisible: boolean;
    trainingsplanVisible: boolean;
    wochenplanVisible: boolean;
    homepageVisible: boolean;
    teamPageVisible: boolean;
    homeAway: string | null;
  };
};

export type PublicTournamentEligibility =
  | { eligible: true }
  | { eligible: false; httpStatus: 404; reason: string };

const PUBLISHABLE_REVIEW_STAGES = new Set(["APPROVED", "PUBLISHED"]);

export function assertPublicTournamentEligible(
  input: PublicTournamentEligibilityInput,
): PublicTournamentEligibility {
  if (input.event.tenantId !== input.tenantId) {
    return { eligible: false, httpStatus: 404, reason: "TENANT_MISMATCH" };
  }

  if (input.event.type !== "TOURNAMENT") {
    return { eligible: false, httpStatus: 404, reason: "TYPE_MISMATCH" };
  }

  if (!PUBLISHABLE_REVIEW_STAGES.has(input.event.reviewStage)) {
    return { eligible: false, httpStatus: 404, reason: "NOT_PUBLISHED" };
  }

  const decision = evaluatePublication(
    {
      tenantId: input.event.tenantId,
      type: input.event.type,
      status: input.event.status,
      infoboardVisible: input.event.infoboardVisible,
      websiteVisible: input.event.websiteVisible,
      trainingsplanVisible: input.event.trainingsplanVisible,
      wochenplanVisible: input.event.wochenplanVisible,
      homeAway: input.event.homeAway,
    },
    "WEBSITE_TOURNAMENTS",
    input.tenantId,
  );

  if (!decision.eligible) {
    return { eligible: false, httpStatus: 404, reason: decision.reason };
  }

  return { eligible: true };
}
