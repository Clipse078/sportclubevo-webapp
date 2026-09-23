/**
 * WORKSPACE-08-03 — reference-aware irreversible document purge (trashed content).
 */

import { prisma } from "@/lib/db/prisma";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { WORKSPACE_DELETION_BLOCKED_CODE } from "@/lib/workspace/deletion/deletion-blockers";
import {
  evaluateWorkspaceDocumentPurgeEligibility,
  WorkspacePurgeEligibilityStatus,
  type WorkspacePurgeEligibilityResult,
} from "@/lib/workspace/governance/purge-eligibility";
import { purgeWorkspaceVersionStorageKeys } from "@/lib/workspace/governance/workspace-purge-storage";

export type WorkspaceDocumentPurgeErrorCode =
  | "INVALID_INPUT"
  | "DOCUMENT_NOT_FOUND"
  | "TENANT_FORBIDDEN"
  | "NOT_ELIGIBLE"
  | typeof WORKSPACE_DELETION_BLOCKED_CODE;

export class WorkspaceDocumentPurgeError extends Error {
  readonly code: WorkspaceDocumentPurgeErrorCode;
  readonly eligibility?: WorkspacePurgeEligibilityResult;

  constructor(
    code: WorkspaceDocumentPurgeErrorCode,
    message: string,
    eligibility?: WorkspacePurgeEligibilityResult,
  ) {
    super(message);
    this.name = "WorkspaceDocumentPurgeError";
    this.code = code;
    this.eligibility = eligibility;
  }
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new WorkspaceDocumentPurgeError(
      "INVALID_INPUT",
      `${fieldName} is required.`,
    );
  }
  return normalized;
}

export type PurgeWorkspaceDocumentResult = {
  documentId: string;
  versionCount: number;
  alreadyPurged?: boolean;
};

export async function purgeWorkspaceDocumentPermanently(input: {
  tenantId: string;
  documentId: string;
  actorUserId?: string | null;
  source?: string;
  /** Cron batch uses trashed+retention gates; manual path uses same default. */
  requireTrashed?: boolean;
  skipIfAlreadyMissing?: boolean;
}): Promise<PurgeWorkspaceDocumentResult> {
  const tenantId = normalizeRequiredText(input.tenantId, "tenantId");
  const documentId = normalizeRequiredText(input.documentId, "documentId");

  const eligibility = await evaluateWorkspaceDocumentPurgeEligibility(prisma, {
    tenantId,
    documentId,
    requireTrashed: input.requireTrashed,
  });

  if (eligibility === null) {
    if (input.skipIfAlreadyMissing) {
      return { documentId, versionCount: 0, alreadyPurged: true };
    }
    throw new WorkspaceDocumentPurgeError(
      "DOCUMENT_NOT_FOUND",
      "Dokument nicht gefunden.",
    );
  }

  if (!eligibility.eligible) {
    await prisma.$transaction(async (tx) => {
      await writeWorkspaceGovernanceAudit(tx, {
        tenantId,
        actorUserId: input.actorUserId ?? null,
        entityType: "WorkspaceDocument",
        entityId: documentId,
        documentId,
        action: WorkspaceAuditAction.PURGE_BLOCKED,
        outcome: "DENIED",
        reason: eligibility.status,
        source: input.source ?? "purge",
        afterJson: {
          status: eligibility.status,
          holdIds: "holdIds" in eligibility ? eligibility.holdIds : undefined,
          blockerKinds:
            "blockers" in eligibility
              ? eligibility.blockers?.map((b) => b.kind)
              : undefined,
        },
      });
    });

    const code =
      eligibility.status === WorkspacePurgeEligibilityStatus.BLOCKING_REFERENCE
        ? WORKSPACE_DELETION_BLOCKED_CODE
        : "NOT_ELIGIBLE";

    throw new WorkspaceDocumentPurgeError(
      code,
      "Document purge is blocked.",
      eligibility,
    );
  }

  let versionCount = 0;
  let storageKeys: string[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT "id" FROM "WorkspaceDocument"
      WHERE "id" = ${documentId} AND "tenantId" = ${tenantId}
      FOR UPDATE
    `;

    const lockedEligibility = await evaluateWorkspaceDocumentPurgeEligibility(tx, {
      tenantId,
      documentId,
      requireTrashed: input.requireTrashed,
    });

    if (!lockedEligibility?.eligible) {
      throw new WorkspaceDocumentPurgeError(
        "NOT_ELIGIBLE",
        "Document purge is blocked.",
        lockedEligibility ?? undefined,
      );
    }

    const document = await tx.workspaceDocument.findFirst({
      where: { id: documentId, tenantId },
      select: {
        id: true,
        versions: { select: { storageKey: true } },
      },
    });

    if (!document) {
      throw new WorkspaceDocumentPurgeError(
        "DOCUMENT_NOT_FOUND",
        "Dokument nicht gefunden.",
      );
    }

    versionCount = document.versions.length;
    storageKeys = document.versions.map((v) => v.storageKey);
  });

  const storageResult = await purgeWorkspaceVersionStorageKeys(
    prisma,
    tenantId,
    documentId,
    storageKeys,
  );

  if (!storageResult.ok) {
    throw new WorkspaceDocumentPurgeError(
      "NOT_ELIGIBLE",
      `Storage purge failed: ${storageResult.kind}`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.workspaceBreakGlassSession.deleteMany({
      where: { tenantId, workspaceDocumentId: documentId },
    });

    await writeWorkspaceGovernanceAudit(tx, {
      tenantId,
      actorUserId: input.actorUserId ?? null,
      entityType: "WorkspaceDocument",
      entityId: documentId,
      documentId,
      action: WorkspaceAuditAction.PURGE_COMPLETED,
      source: input.source ?? "purge",
      afterJson: {
        versionCount,
        deletedStorageKeyCount: storageResult.deletedKeys.length,
        skippedMissingStorageKeyCount: storageResult.skippedMissingKeys.length,
      },
    });

    await tx.workspaceDocument.delete({
      where: { id: documentId },
    });
  });

  return { documentId, versionCount };
}
