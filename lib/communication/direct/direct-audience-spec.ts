import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

export function explicitPersonAudienceSpec(personIds: readonly string[]): CommunicationAudienceSpec {
  const ids = [...new Set(personIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    throw new TeamCommunicationValidationError("at least one recipient is required");
  }
  return {
    composition: "UNION",
    components: [{ explicit: { includePersonIds: ids } }],
  };
}

export function singleRecipientAudienceSpec(personId: string): CommunicationAudienceSpec {
  return explicitPersonAudienceSpec([personId]);
}
