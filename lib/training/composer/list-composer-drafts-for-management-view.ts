import { listTrainingComposerDraftsForManagement } from "./training-draft-persistence";
import type { TrainingComposerDraftPayload } from "./training-composer-draft-types";

export async function listTrainingComposerDraftsForManagementView(tenantId: string) {
  const rows = await listTrainingComposerDraftsForManagement(tenantId);
  return rows.map((row) => {
    const payload = row.payload as TrainingComposerDraftPayload;
    return {
      id: row.id,
      lifecycleState: row.lifecycleState,
      title: payload.title ?? "",
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}
