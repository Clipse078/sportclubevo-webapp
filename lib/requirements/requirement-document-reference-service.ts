/**
 * WORKSPACE-07 — Requirement ↔ WorkspaceDocumentVersion references.
 */

import { writeAuditRecord } from "@/lib/audit/audit-record";
import { prisma } from "@/lib/db/prisma";
import { WORKSPACE_DOCUMENT_LINKABLE_ERROR } from "@/lib/workspace/document-access";
import { resolveExactVersionReferencePresentations } from "@/lib/workspace/reference/resolve-workspace-version-references";
import type { WorkspaceVersionReferencePresentation } from "@/lib/workspace/reference/workspace-version-reference-presentation";
import {
  resolveWorkspaceDocumentVersionForLink,
  WorkspaceVersionLinkValidationError,
} from "@/lib/workspace/reference/workspace-version-link-validation";
import { assertRequirementReferenceMutable } from "./requirement-document-reference-mutable";
import { RequirementForbiddenError, RequirementValidationError } from "./errors";
import { canManageRequirement, canReadRequirement } from "./requirement-authorization";
import type { RequirementServiceContext } from "./types";

export type RequirementDocumentReferenceDto = {
  referenceId: string;
  presentation: WorkspaceVersionReferencePresentation;
  linkedAt: string;
};

export { assertRequirementReferenceMutable };

async function loadRequirementForReferenceEdit(
  ctx: RequirementServiceContext,
  requirementId: string,
) {
  const requirement = await prisma.requirement.findFirst({
    where: { id: requirementId, tenantId: ctx.tenantId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      createdByUserId: true,
    },
  });
  if (!requirement) {
    throw new RequirementValidationError("Requirement not found");
  }
  if (!canManageRequirement(ctx, requirement)) {
    throw new RequirementForbiddenError();
  }
  assertRequirementReferenceMutable(requirement.status);
  return requirement;
}

export async function listRequirementDocumentReferences(
  ctx: RequirementServiceContext,
  requirementId: string,
): Promise<RequirementDocumentReferenceDto[]> {
  const requirement = await prisma.requirement.findFirst({
    where: { id: requirementId, tenantId: ctx.tenantId },
    select: { id: true, tenantId: true, createdByUserId: true },
  });
  if (!requirement) {
    throw new RequirementValidationError("Requirement not found");
  }
  if (!canReadRequirement(ctx, requirement)) {
    throw new RequirementForbiddenError();
  }

  const references = await prisma.requirementWorkspaceDocumentVersionReference.findMany({
    where: { tenantId: ctx.tenantId, requirementId },
    orderBy: { createdAt: "asc" },
    select: { id: true, workspaceDocumentVersionId: true, createdAt: true },
  });

  if (references.length === 0) return [];

  const presentations = await resolveExactVersionReferencePresentations(
    ctx,
    references.map((row) => ({
      referenceId: row.id,
      workspaceDocumentVersionId: row.workspaceDocumentVersionId,
    })),
  );

  return references.map((row) => ({
    referenceId: row.id,
    linkedAt: row.createdAt.toISOString(),
    presentation:
      presentations.get(row.id) ??
      ({ accessible: false, referenceId: row.id } satisfies WorkspaceVersionReferencePresentation),
  }));
}

export type LinkRequirementDocumentVersionInput = {
  documentId: string;
  workspaceDocumentVersionId?: string | null;
};

export async function linkRequirementDocumentReference(
  ctx: RequirementServiceContext,
  requirementId: string,
  input: LinkRequirementDocumentVersionInput,
): Promise<void> {
  await loadRequirementForReferenceEdit(ctx, requirementId);

  const normalizedDocumentId = input.documentId.trim();
  if (!normalizedDocumentId) {
    throw new RequirementValidationError("documentId is required");
  }

  let resolved;
  try {
    resolved = await resolveWorkspaceDocumentVersionForLink(ctx, {
      documentId: normalizedDocumentId,
      workspaceDocumentVersionId: input.workspaceDocumentVersionId,
    });
  } catch (error) {
    if (error instanceof WorkspaceVersionLinkValidationError) {
      throw new RequirementValidationError(WORKSPACE_DOCUMENT_LINKABLE_ERROR);
    }
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT "id" FROM "WorkspaceDocument"
      WHERE "id" = ${resolved.documentId} AND "tenantId" = ${ctx.tenantId}
      FOR UPDATE
    `;

    const created = await tx.requirementWorkspaceDocumentVersionReference.createMany({
      data: [
        {
          tenantId: ctx.tenantId,
          requirementId,
          workspaceDocumentVersionId: resolved.workspaceDocumentVersionId,
          createdByUserId: ctx.userId,
        },
      ],
      skipDuplicates: true,
    });

    if (created.count > 0) {
      await writeAuditRecord(tx, {
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        moduleKey: "requirements",
        entityType: "Requirement",
        entityId: requirementId,
        action: "REQUIREMENT_DOCUMENT_LINKED",
        afterJson: {
          documentId: resolved.documentId,
          workspaceDocumentVersionId: resolved.workspaceDocumentVersionId,
        },
      });
    }
  });
}

export async function unlinkRequirementDocumentReference(
  ctx: RequirementServiceContext,
  requirementId: string,
  referenceId: string,
): Promise<void> {
  await loadRequirementForReferenceEdit(ctx, requirementId);

  const normalizedReferenceId = referenceId.trim();
  if (!normalizedReferenceId) {
    throw new RequirementValidationError("referenceId is required");
  }

  const deleted = await prisma.requirementWorkspaceDocumentVersionReference.deleteMany({
    where: {
      tenantId: ctx.tenantId,
      requirementId,
      id: normalizedReferenceId,
    },
  });

  if (deleted.count > 0) {
    await writeAuditRecord(prisma, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      moduleKey: "requirements",
      entityType: "Requirement",
      entityId: requirementId,
      action: "REQUIREMENT_DOCUMENT_UNLINKED",
      afterJson: { referenceId: normalizedReferenceId },
    });
  }
}

export async function searchWorkspaceDocumentsForRequirementReferenceLink(
  ctx: RequirementServiceContext,
  requirementId: string,
  query: string,
  limit?: number,
) {
  await loadRequirementForReferenceEdit(ctx, requirementId);
  const { searchWorkspaceDocumentsForTaskLink } = await import(
    "@/lib/workspace/document-access"
  );
  return searchWorkspaceDocumentsForTaskLink(ctx, query, limit);
}
