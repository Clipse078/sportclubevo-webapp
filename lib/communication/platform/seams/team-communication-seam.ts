/**
 * SCE-COMM-01 — Team communication defaults (UX seam only).
 */

import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type {
  CommunicationAudienceSpec,
  ZielgruppeAudienceComponent,
} from "@/lib/communication/platform/audience/zielgruppe-definition";

export function teamCommunicationContext(teamId: string): CommunicationContextRef {
  return { kind: "TEAM", teamId: teamId.trim() };
}

/** Alias for service-layer entry points (COMM-04). */
export const createTeamCommunicationContext = teamCommunicationContext;

/** Default audience for trainer "Nachricht an Team" — no manual Zielgruppe pick required. */
export function defaultTeamOperationalAudience(teamId: string): CommunicationAudienceSpec {
  const component: ZielgruppeAudienceComponent = {
    label: "Team (default)",
    structural: { teamIds: [teamId.trim()] },
  };
  return {
    composition: "UNION",
    components: [component],
  };
}

/** Persistent team conversation thread key (future COMM-04/05). */
export type TeamConversationAnchor = {
  tenantId: string;
  teamId: string;
  threadKind: "TEAM_GENERAL" | "TEAM_NAMED";
  namedThreadSlug?: string;
};
