import type { PrismaClient } from "@prisma/client";

import { isTrashRetentionExpired } from "@/lib/workspace/governance/retention-constants";
import { resolveWorkspaceTrashRetentionDays } from "@/lib/workspace/governance/trash-retention-policy-service";
import { deriveWorkspaceFolderLifecycle } from "@/lib/workspace/lifecycle/lifecycle-domain";
import { isWorkspaceFolderAncestorOf } from "@/lib/workspace/folder-ancestor";

export const WorkspaceFolderPurgeEligibilityStatus = {
  ELIGIBLE: "ELIGIBLE",
  RETENTION_NOT_EXPIRED: "RETENTION_NOT_EXPIRED",
  NOT_TRASHED: "NOT_TRASHED",
  ACTIVE_GOVERNANCE_HOLD: "ACTIVE_GOVERNANCE_HOLD",
} as const;

export type WorkspaceFolderPurgeEligibilityResult =
  | { eligible: true; status: typeof WorkspaceFolderPurgeEligibilityStatus.ELIGIBLE }
  | {
      eligible: false;
      status: Exclude<
        (typeof WorkspaceFolderPurgeEligibilityStatus)[keyof typeof WorkspaceFolderPurgeEligibilityStatus],
        typeof WorkspaceFolderPurgeEligibilityStatus.ELIGIBLE
      >;
      holdIds?: string[];
    };

export async function evaluateWorkspaceFolderPurgeEligibility(
  client: Pick<
    PrismaClient,
    "workspaceFolder" | "workspaceGovernanceHold" | "workspaceTrashRetentionPolicy"
  >,
  input: { tenantId: string; folderId: string; now?: Date },
): Promise<WorkspaceFolderPurgeEligibilityResult | null> {
  const folder = await client.workspaceFolder.findFirst({
    where: { id: input.folderId, tenantId: input.tenantId },
    select: { id: true, trashedAt: true, archivedAt: true },
  });

  if (!folder) {
    return null;
  }

  const lifecycle = deriveWorkspaceFolderLifecycle(folder);
  if (lifecycle !== "TRASHED" || !folder.trashedAt) {
    return {
      eligible: false,
      status: WorkspaceFolderPurgeEligibilityStatus.NOT_TRASHED,
    };
  }

  const retentionDays = await resolveWorkspaceTrashRetentionDays(
    client,
    input.tenantId,
  );
  const now = input.now ?? new Date();
  if (!isTrashRetentionExpired(folder.trashedAt, retentionDays, now)) {
    return {
      eligible: false,
      status: WorkspaceFolderPurgeEligibilityStatus.RETENTION_NOT_EXPIRED,
    };
  }

  const subtreeHolds = await client.workspaceGovernanceHold.findMany({
    where: {
      tenantId: input.tenantId,
      releasedAt: null,
      scopeType: "FOLDER_SUBTREE",
      folderId: { not: null },
    },
    select: { id: true, folderId: true },
  });

  const holdIds: string[] = [];
  for (const hold of subtreeHolds) {
    if (
      hold.folderId &&
      (await isWorkspaceFolderAncestorOf(
        client,
        input.tenantId,
        hold.folderId,
        input.folderId,
      ))
    ) {
      holdIds.push(hold.id);
    }
  }

  if (holdIds.length > 0) {
    return {
      eligible: false,
      status: WorkspaceFolderPurgeEligibilityStatus.ACTIVE_GOVERNANCE_HOLD,
      holdIds,
    };
  }

  return {
    eligible: true,
    status: WorkspaceFolderPurgeEligibilityStatus.ELIGIBLE,
  };
}
