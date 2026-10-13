import { listClubEventComposerDraftsForManagement } from "./club-event-draft-persistence";
import type { ClubEventComposerDraftPayload } from "./club-event-composer-draft-types";

export async function listClubEventComposerDraftsForManagementView(tenantId: string) {
  const rows = await listClubEventComposerDraftsForManagement(tenantId);
  return rows.map((row) => {
    const payload = row.payload as ClubEventComposerDraftPayload;
    return {
      id: row.id,
      lifecycleState: row.lifecycleState,
      title: payload.title ?? "",
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}
