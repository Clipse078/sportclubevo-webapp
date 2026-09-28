import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

export type MitteilungAudienceEditorMode = "WHOLE_ORG" | "TARGET_GROUPS";

export function inferMitteilungAudienceEditorState(audience: CommunicationAudienceSpec): {
  mode: MitteilungAudienceEditorMode;
  selectedGroupIds: string[];
} {
  const groupIds = new Set<string>();
  let wholeOrg = false;
  for (const component of audience.components) {
    if (component.structural?.wholeOrganisation) wholeOrg = true;
    for (const id of component.savedTargetGroupIds ?? []) {
      groupIds.add(id);
    }
  }
  if (groupIds.size > 0) {
    return { mode: "TARGET_GROUPS", selectedGroupIds: [...groupIds] };
  }
  return { mode: wholeOrg ? "WHOLE_ORG" : "WHOLE_ORG", selectedGroupIds: [] };
}
