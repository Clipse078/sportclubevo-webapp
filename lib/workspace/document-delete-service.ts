/**
 * lib/workspace/document-delete-service.ts
 *
 * WORKSPACE-06 + WORKSPACE-08-03 — reference-aware permanent delete routed through purge eligibility.
 */

import { prisma } from "@/lib/db/prisma";
import {
  getWorkspaceDocumentDeletionBlockers,
  WORKSPACE_DELETION_BLOCKED_CODE,
  type WorkspaceDeletionBlocker,
} from "@/lib/workspace/deletion/deletion-blockers";
import {
  evaluateWorkspaceDocumentPurgeEligibility,
  WorkspacePurgeEligibilityStatus,
} from "@/lib/workspace/governance/purge-eligibility";
import {
  purgeWorkspaceDocumentPermanently,
  WorkspaceDocumentPurgeError,
} from "@/lib/workspace/governance/workspace-document-purge-service";

export type WorkspaceDocumentDeleteServiceErrorCode =
  | "INVALID_INPUT"
  | "DOCUMENT_NOT_FOUND"
  | "TENANT_FORBIDDEN"
  | "NOT_TRASHED"
  | "RETENTION_NOT_EXPIRED"
  | "ACTIVE_GOVERNANCE_HOLD"
  | typeof WORKSPACE_DELETION_BLOCKED_CODE;

export class WorkspaceDocumentDeleteServiceError extends Error {
  readonly code: WorkspaceDocumentDeleteServiceErrorCode;
  readonly blockers?: WorkspaceDeletionBlocker[];

  constructor(
    code: WorkspaceDocumentDeleteServiceErrorCode,
    message: string,
    blockers?: WorkspaceDeletionBlocker[],
  ) {
    super(message);
    this.name = "WorkspaceDocumentDeleteServiceError";
    this.code = code;
    this.blockers = blockers;
  }
}

export type DocumentDeletionImpact = {
  versionCount: number;
  referenceBlockers: WorkspaceDeletionBlocker[];
  purgeEligibilityStatus?: string;
};

export type DeleteWorkspaceDocumentResult = {
  documentId: string;
  documentName: string;
  impact: Omit<DocumentDeletionImpact, "referenceBlockers">;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new WorkspaceDocumentDeleteServiceError(
      "INVALID_INPUT",
      `${fieldName} is required.`,
    );
  }

  return normalized;
}

function mapPurgeError(
  error: WorkspaceDocumentPurgeError,
): WorkspaceDocumentDeleteServiceError {
  const eligibility = error.eligibility;
  if (eligibility && !eligibility.eligible) {
    switch (eligibility.status) {
      case WorkspacePurgeEligibilityStatus.NOT_TRASHED:
        return new WorkspaceDocumentDeleteServiceError(
          "NOT_TRASHED",
          "Nur Papierkorb-Inhalte können endgültig gelöscht werden.",
        );
      case WorkspacePurgeEligibilityStatus.RETENTION_NOT_EXPIRED:
        return new WorkspaceDocumentDeleteServiceError(
          "RETENTION_NOT_EXPIRED",
          "Die Aufbewahrungsfrist für Papierkorb-Inhalte ist noch nicht abgelaufen.",
        );
      case WorkspacePurgeEligibilityStatus.ACTIVE_GOVERNANCE_HOLD:
        return new WorkspaceDocumentDeleteServiceError(
          "ACTIVE_GOVERNANCE_HOLD",
          "Ein aktiver Governance-Hold blockiert die endgültige Löschung.",
        );
      case WorkspacePurgeEligibilityStatus.BLOCKING_REFERENCE:
        return new WorkspaceDocumentDeleteServiceError(
          WORKSPACE_DELETION_BLOCKED_CODE,
          "Das Dokument kann nicht endgültig gelöscht werden, solange durable Referenzen bestehen.",
          eligibility.blockers,
        );
      default:
        return new WorkspaceDocumentDeleteServiceError("NOT_TRASHED", error.message);
    }
  }

  if (error.code === "DOCUMENT_NOT_FOUND") {
    return new WorkspaceDocumentDeleteServiceError(
      "DOCUMENT_NOT_FOUND",
      error.message,
    );
  }

  return new WorkspaceDocumentDeleteServiceError("NOT_TRASHED", error.message);
}

export async function getWorkspaceDocumentDeletionImpact(
  tenantId: string,
  documentId: string,
): Promise<DocumentDeletionImpact | null> {
  const cleanTenantId = normalizeRequiredText(tenantId, "tenantId");
  const cleanDocumentId = normalizeRequiredText(documentId, "documentId");

  const document = await prisma.workspaceDocument.findUnique({
    where: { id: cleanDocumentId },
    select: {
      id: true,
      tenantId: true,
      _count: { select: { versions: true } },
    },
  });

  if (!document || document.tenantId !== cleanTenantId) {
    return null;
  }

  const referenceBlockers = await getWorkspaceDocumentDeletionBlockers(
    prisma,
    cleanTenantId,
    cleanDocumentId,
  );

  const eligibility = await evaluateWorkspaceDocumentPurgeEligibility(prisma, {
    tenantId: cleanTenantId,
    documentId: cleanDocumentId,
  });

  return {
    versionCount: document._count.versions,
    referenceBlockers,
    purgeEligibilityStatus: eligibility?.status,
  };
}

export async function deleteWorkspaceDocumentPermanently(
  tenantId: string,
  documentId: string,
  actorUserId?: string | null,
): Promise<DeleteWorkspaceDocumentResult> {
  const cleanTenantId = normalizeRequiredText(tenantId, "tenantId");
  const cleanDocumentId = normalizeRequiredText(documentId, "documentId");

  const document = await prisma.workspaceDocument.findFirst({
    where: { id: cleanDocumentId, tenantId: cleanTenantId },
    select: { name: true },
  });

  if (!document) {
    throw new WorkspaceDocumentDeleteServiceError(
      "DOCUMENT_NOT_FOUND",
      "Dokument nicht gefunden.",
    );
  }

  try {
    const result = await purgeWorkspaceDocumentPermanently({
      tenantId: cleanTenantId,
      documentId: cleanDocumentId,
      actorUserId: actorUserId ?? null,
      source: "manual-permanent-delete",
      requireTrashed: true,
    });

    return {
      documentId: cleanDocumentId,
      documentName: document.name,
      impact: { versionCount: result.versionCount },
    };
  } catch (err) {
    if (err instanceof WorkspaceDocumentPurgeError) {
      throw mapPurgeError(err);
    }
    throw err;
  }
}
