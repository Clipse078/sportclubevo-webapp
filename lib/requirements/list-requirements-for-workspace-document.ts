/**
 * W09-02 — Requirements linked to a Workspace document via exact version references.
 * Zero disclosure: returns null when the caller lacks Requirements domain access.
 */

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { canReadWorkspaceDocument } from "@/lib/workspace/document-access";
import { requirementDetailHref } from "@/lib/requirements/management-navigation";
import {
  canCreateRequirement,
  canReadRequirement,
  hasRequirementPermission,
} from "@/lib/requirements/requirement-authorization";
import type { RequirementServiceContext } from "@/lib/requirements/types";
import type { RequirementStatus } from "@prisma/client";

export type WorkspaceDocumentLinkedRequirementRow = {
  requirementId: string;
  title: string;
  status: RequirementStatus;
  href: string;
  linkedVersionNumber: number;
  referenceId: string;
};

export type ListRequirementsForWorkspaceDocumentResult =
  | { visible: false }
  | {
      visible: true;
      count: number;
      requirements: WorkspaceDocumentLinkedRequirementRow[];
      canCreate: boolean;
    };

function canViewRequirementsDomain(ctx: RequirementServiceContext): boolean {
  return (
    hasRequirementPermission(ctx, PERMISSIONS.REQUIREMENTS_VIEW) ||
    hasRequirementPermission(ctx, PERMISSIONS.REQUIREMENTS_MANAGE) ||
    hasRequirementPermission(ctx, PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE)
  );
}

export async function listRequirementsForWorkspaceDocument(
  ctx: RequirementServiceContext,
  documentId: string,
): Promise<ListRequirementsForWorkspaceDocumentResult> {
  if (!canViewRequirementsDomain(ctx)) {
    return { visible: false };
  }

  const normalizedDocumentId = documentId.trim();
  if (!normalizedDocumentId) {
    return { visible: false };
  }

  const documentReadable = await canReadWorkspaceDocument(ctx, normalizedDocumentId);
  if (!documentReadable) {
    return { visible: false };
  }

  const versions = await prisma.workspaceDocumentVersion.findMany({
    where: { tenantId: ctx.tenantId, documentId: normalizedDocumentId },
    select: { id: true, versionNumber: true },
  });

  const versionNumberById = new Map(versions.map((v) => [v.id, v.versionNumber]));
  const versionIds = versions.map((v) => v.id);

  if (versionIds.length === 0) {
    return {
      visible: true,
      count: 0,
      requirements: [],
      canCreate: canCreateRequirement(ctx) && documentReadable,
    };
  }

  const references = await prisma.requirementWorkspaceDocumentVersionReference.findMany({
    where: {
      tenantId: ctx.tenantId,
      workspaceDocumentVersionId: { in: versionIds },
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      workspaceDocumentVersionId: true,
      requirement: {
        select: {
          id: true,
          title: true,
          status: true,
          tenantId: true,
          createdByUserId: true,
        },
      },
    },
  });

  const requirements: WorkspaceDocumentLinkedRequirementRow[] = [];

  for (const ref of references) {
    if (!canReadRequirement(ctx, ref.requirement)) {
      continue;
    }
    const versionNumber = versionNumberById.get(ref.workspaceDocumentVersionId);
    if (versionNumber == null) continue;

    requirements.push({
      referenceId: ref.id,
      requirementId: ref.requirement.id,
      title: ref.requirement.title,
      status: ref.requirement.status,
      href: requirementDetailHref(ref.requirement.id),
      linkedVersionNumber: versionNumber,
    });
  }

  return {
    visible: true,
    count: requirements.length,
    requirements,
    canCreate: canCreateRequirement(ctx) && documentReadable,
  };
}

export async function countRequirementsForWorkspaceDocument(
  ctx: RequirementServiceContext,
  documentId: string,
): Promise<number | null> {
  const result = await listRequirementsForWorkspaceDocument(ctx, documentId);
  if (!result.visible) return null;
  return result.count;
}
