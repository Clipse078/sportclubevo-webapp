import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { inferCommunicationAudienceSelection } from "@/lib/communication/audience/communication-audience-selection";

export type MitteilungAudienceEditorMode = "WHOLE_ORG" | "TARGET_GROUPS";

/** @deprecated Use inferCommunicationAudienceSelection — kept for legacy tests. */
export function inferMitteilungAudienceEditorState(audience: CommunicationAudienceSpec): {
  mode: MitteilungAudienceEditorMode;
  selectedGroupIds: string[];
} {
  const selection = inferCommunicationAudienceSelection(audience);
  if (selection.targetGroupIds.length > 0) {
    return { mode: "TARGET_GROUPS", selectedGroupIds: selection.targetGroupIds };
  }
  return { mode: selection.wholeOrganisation ? "WHOLE_ORG" : "WHOLE_ORG", selectedGroupIds: [] };
}

export { inferCommunicationAudienceSelection };
