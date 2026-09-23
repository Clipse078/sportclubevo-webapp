import {
  WorkspaceDocumentStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import {
  canPermanentlyDeleteWorkspaceDocument,
  type WorkspaceDeletionBlocker,
} from "@/lib/workspace/deletion/deletion-blockers";
import { isWorkspaceFolderAncestorOf } from "@/lib/workspace/folder-ancestor";
import { deriveWorkspaceDocumentLifecycle } from "@/lib/workspace/lifecycle/lifecycle-domain";
import { isTrashRetentionExpired } from "@/lib/workspace/governance/retention-constants";
import { resolveWorkspaceTrashRetentionDays } from "@/lib/workspace/governance/trash-retention-policy-service";

export const WorkspacePurgeEligibilityStatus = {
  ELIGIBLE: "ELIGIBLE",
  RETENTION_NOT_EXPIRED: "RETENTION_NOT_EXPIRED",
  NOT_TRASHED: "NOT_TRASHED",
  ACTIVE_GOVERNANCE_HOLD: "ACTIVE_GOVERNANCE_HOLD",
  BLOCKING_REFERENCE: "BLOCKING_REFERENCE",
} as const;

export type WorkspacePurgeEligibilityStatusValue =
  (typeof WorkspacePurgeEligibilityStatus)[keyof typeof WorkspacePurgeEligibilityStatus];

export type WorkspacePurgeEligibilityResult =
  | {
      eligible: true;
      status: typeof WorkspacePurgeEligibilityStatus.ELIGIBLE;
      retentionDays: number;
      purgeEligibleAt: Date;
    }
  | {
      eligible: false;
      status: Exclude<
        WorkspacePurgeEligibilityStatusValue,
        typeof WorkspacePurgeEligibilityStatus.ELIGIBLE
      >;
      retentionDays: number;
      purgeEligibleAt?: Date;
      holdIds?: string[];
      blockers?: WorkspaceDeletionBlocker[];
    };

type PurgeEligibilityClient = Pick<
  PrismaClient,
  | "workspaceDocument"
  | "workspaceGovernanceHold"
  | "workspaceFolder"
  | "workspaceTrashRetentionPolicy"
  | "taskDocumentReference"
  | "requirementWorkspaceDocumentVersionReference"
>;

export async function evaluateWorkspaceDocumentPurgeEligibility(
  client: PurgeEligibilityClient,
  input: {
    tenantId: string;
    documentId: string;
    now?: Date;
    /** When false, skip trash/retention gates (internal diagnostics only). */
    requireTrashed?: boolean;
  },
): Promise<WorkspacePurgeEligibilityResult | null> {
  const now = input.now ?? new Date();
  const requireTrashed = input.requireTrashed !== false;

  const document = await client.workspaceDocument.findFirst({
    where: { id: input.documentId, tenantId: input.tenantId },
    select: {
      id: true,
      status: true,
      archivedAt: true,
      trashedAt: true,
      folderId: true,
    },
  });

  if (!document) {
    return null;
  }

  const retentionDays = await resolveWorkspaceTrashRetentionDays(
    client,
    input.tenantId,
  );

  const lifecycle = deriveWorkspaceDocumentLifecycle(document);
  if (requireTrashed && lifecycle !== "TRASHED") {
    return {
      eligible: false,
      status: WorkspacePurgeEligibilityStatus.NOT_TRASHED,
      retentionDays,
    };
  }

  const trashedAt = document.trashedAt;
  if (requireTrashed && trashedAt) {
    if (!isTrashRetentionExpired(trashedAt, retentionDays, now)) {
      const purgeEligibleAt = new Date(
        trashedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000,
      );
      return {
        eligible: false,
        status: WorkspacePurgeEligibilityStatus.RETENTION_NOT_EXPIRED,
        retentionDays,
        purgeEligibleAt,
      };
    }
  }

  const activeHolds = await client.workspaceGovernanceHold.findMany({
    where: {
      tenantId: input.tenantId,
      releasedAt: null,
      OR: [
        { scopeType: "DOCUMENT", documentId: input.documentId },
        { scopeType: "FOLDER_SUBTREE", folderId: { not: null } },
      ],
    },
    select: { id: true, scopeType: true, folderId: true },
  });

  const matchingHoldIds: string[] = [];
  for (const hold of activeHolds) {
    if (hold.scopeType === "DOCUMENT") {
      matchingHoldIds.push(hold.id);
      continue;
    }
    if (
      hold.folderId &&
      (await isWorkspaceFolderAncestorOf(
        client,
        input.tenantId,
        hold.folderId,
        document.folderId,
      ))
    ) {
      matchingHoldIds.push(hold.id);
    }
  }

  if (matchingHoldIds.length > 0) {
    return {
      eligible: false,
      status: WorkspacePurgeEligibilityStatus.ACTIVE_GOVERNANCE_HOLD,
      retentionDays,
      holdIds: matchingHoldIds,
    };
  }

  const deletionCheck = await canPermanentlyDeleteWorkspaceDocument(
    client,
    input.tenantId,
    input.documentId,
  );

  if (!deletionCheck.allowed) {
    return {
      eligible: false,
      status: WorkspacePurgeEligibilityStatus.BLOCKING_REFERENCE,
      retentionDays,
      blockers: deletionCheck.blockers,
    };
  }

  const purgeEligibleAt =
    trashedAt && requireTrashed
      ? new Date(trashedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000)
      : now;

  return {
    eligible: true,
    status: WorkspacePurgeEligibilityStatus.ELIGIBLE,
    retentionDays,
    purgeEligibleAt,
  };
}

/** @deprecated use evaluateWorkspaceDocumentPurgeEligibility */
export const evaluateWorkspacePurgeEligibility = evaluateWorkspaceDocumentPurgeEligibility;

export function workspaceTrashedDocumentPurgeCandidateWhere(
  retentionDays: number,
  now: Date = new Date(),
): Prisma.WorkspaceDocumentWhereInput {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  return {
    status: WorkspaceDocumentStatus.TRASHED,
    trashedAt: { not: null, lte: cutoff },
  };
}
