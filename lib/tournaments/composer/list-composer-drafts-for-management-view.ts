import { listTournamentComposerDraftsForManagement } from "./tournament-draft-persistence";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import { resolveTournamentComposerTitleForResume } from "./tournament-composer-draft-access";

export async function listTournamentComposerDraftsForManagementView(tenantId: string) {
  const rows = await listTournamentComposerDraftsForManagement(tenantId);
  return rows.map((row) => {
    const payload = row.payload as TournamentComposerDraftPayload;
    return {
      id: row.id,
      lifecycleState: row.lifecycleState,
      title: resolveTournamentComposerTitleForResume(payload.title),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}
