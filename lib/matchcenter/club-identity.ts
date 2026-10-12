/**
 * Club Identity Resolution — MATCHCENTER-UX-03-C1
 *
 * @deprecated Import from `@/lib/sporting-activity-design` for new code.
 * This module re-exports the canonical match-side logo rule for existing Matchcenter consumers.
 */

import {
  resolveMatchSideClubLogoUrl,
  type MatchSideClubLogoInput,
} from "@/lib/sporting-activity-design/logo-resolution";

/**
 * Resolves the effective logo URL for one match side.
 */
export function resolveClubIdentityLogoUrl(
  side: MatchSideClubLogoInput,
  tenantLogoUrl: string | null | undefined,
): string | null {
  return resolveMatchSideClubLogoUrl(side, tenantLogoUrl);
}
