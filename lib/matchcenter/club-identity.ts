/**
 * Club Identity Resolution — MATCHCENTER-UX-03-C1
 *
 * @deprecated Import from `@/lib/sporting-activity-design` for new code.
 * This module re-exports the canonical match-side logo rule for existing Matchcenter consumers.
 */

import { resolveMatchSideClubLogoUrl } from "@/lib/sporting-activity-design/logo-resolution";
import type { MatchcenterSide } from "./types";

/**
 * Resolves the effective logo URL for one match side.
 */
export function resolveClubIdentityLogoUrl(
  side: Pick<MatchcenterSide, "isOwnTeam" | "externalLogoUrl">,
  tenantLogoUrl: string | null | undefined,
): string | null {
  return resolveMatchSideClubLogoUrl(side, tenantLogoUrl);
}
