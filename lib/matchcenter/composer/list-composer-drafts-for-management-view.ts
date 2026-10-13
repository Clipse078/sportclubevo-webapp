import { listMatchComposerDraftsForManagement } from "./match-draft-persistence";
import type { MatchComposerDraftPayload } from "./match-composer-draft-types";
import { resolveMatchComposerTitleForResume } from "./match-composer-draft-access";

export async function listMatchComposerDraftsForManagementView(tenantId: string) {
  const rows = await listMatchComposerDraftsForManagement(tenantId);
  return rows.map((row) => {
    const payload = row.payload as MatchComposerDraftPayload;
    const opponent =
      payload.opponentName?.trim() ||
      payload.opponentExternalClubName?.trim() ||
      "";
    return {
      id: row.id,
      lifecycleState: row.lifecycleState,
      title: resolveMatchComposerTitleForResume(payload.teamDisplayName, opponent),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}
