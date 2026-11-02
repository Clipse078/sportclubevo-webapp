/**
 * lib/infoboard/screen1-match-presentation-resolver.ts
 *
 * Presentation-only resolver when a Screen 1 feed event arrives without
 * pre-built matchPresentation (preview fixtures, legacy rows). Uses the same
 * canonical identity builder as screen1-event-mapper — not a tenant-relative
 * UI fallback branch in the component.
 */

import type { InfoboardScreen1Event } from "@/lib/publishing/event-types";
import type { InfoboardMatchPresentation } from "@/lib/publishing/event-types";
import {
  buildInfoboardMatchIdentityFromFixtureFields,
  resolveInfoboardMatchPresentation,
} from "@/lib/publishing/presentation/infoboard-match-presentation";

export function resolveScreen1EventMatchPresentation(
  event: InfoboardScreen1Event,
  tenantLogoUrl: string | null = null,
  tenantClubName: string | null = null,
): InfoboardMatchPresentation | null {
  if (event.type !== "MATCH") return null;
  if (event.matchPresentation !== null) return event.matchPresentation;

  const identity = buildInfoboardMatchIdentityFromFixtureFields({
    homeAway: "HOME",
    team: null,
    teamDisplayName: event.teamDisplayName,
    opponentDisplayName: event.opponentDisplayName,
    opponentLogoUrl: event.opponentLogoUrl,
  });

  return resolveInfoboardMatchPresentation(identity, tenantLogoUrl, tenantClubName);
}
