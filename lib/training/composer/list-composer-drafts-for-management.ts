import { listTrainingComposerDraftsForManagement } from "./training-draft-persistence";

export async function listTrainingComposerDraftsForManagementSurface(tenantId: string) {
  return listTrainingComposerDraftsForManagement(tenantId);
}
