/**
 * WORKSPACE-07 — batch resolve exact-version references with dual-domain zero disclosure.
 */

import { TaskDocumentReferenceVersionBinding } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  filterReadableWorkspaceDocumentIds,
  type WorkspaceDocumentAccessContext,
} from "@/lib/workspace/document-access";
import {
  deriveWorkspaceDocumentLifecycle,
  type WorkspaceDocumentLifecycleState,
} from "@/lib/workspace/lifecycle/lifecycle-domain";
import {
  buildExactVersionWorkspaceUrl,
  restrictedVersionReferencePresentation,
  type WorkspaceVersionReferencePresentation,
} from "@/lib/workspace/reference/workspace-version-reference-presentation";

const LEGACY_UNRESOLVED_MESSAGE =
  "Dokumentreferenz aus älterer Version – genaue Dokumentversion nicht bestimmt.";

export type TaskReferenceRow = {
  referenceId: string;
  workspaceDocumentVersionId: string | null;
  documentId: string | null;
  versionBinding: TaskDocumentReferenceVersionBinding;
};

export type RequirementReferenceRow = {
  referenceId: string;
  workspaceDocumentVersionId: string;
};

export async function resolveExactVersionReferencePresentations(
  ctx: WorkspaceDocumentAccessContext,
  rows: readonly RequirementReferenceRow[],
): Promise<Map<string, WorkspaceVersionReferencePresentation>> {
  const result = new Map<string, WorkspaceVersionReferencePresentation>();
  if (rows.length === 0) return result;

  const versionIds = [...new Set(rows.map((r) => r.workspaceDocumentVersionId))];
  const versions = await prisma.workspaceDocumentVersion.findMany({
    where: { tenantId: ctx.tenantId, id: { in: versionIds } },
    select: {
      id: true,
      documentId: true,
      versionNumber: true,
      document: {
        select: {
          id: true,
          name: true,
          status: true,
          archivedAt: true,
          trashedAt: true,
        },
      },
    },
  });

  const versionById = new Map(versions.map((v) => [v.id, v]));
  const documentIds = [...new Set(versions.map((v) => v.documentId))];
  const readableDocumentIds = await filterReadableWorkspaceDocumentIds(ctx, documentIds);

  for (const row of rows) {
    const version = versionById.get(row.workspaceDocumentVersionId);
    if (!version) {
      result.set(row.referenceId, restrictedVersionReferencePresentation(row.referenceId));
      continue;
    }

    const lifecycle = deriveWorkspaceDocumentLifecycle(version.document);
    if (!readableDocumentIds.has(version.documentId)) {
      result.set(row.referenceId, restrictedVersionReferencePresentation(row.referenceId));
      continue;
    }

    result.set(row.referenceId, {
      accessible: true,
      referenceId: row.referenceId,
      documentId: version.documentId,
      versionId: version.id,
      versionNumber: version.versionNumber,
      documentTitle: version.document.name,
      documentLifecycle: lifecycle,
      canonicalWorkspaceUrl: buildExactVersionWorkspaceUrl(version.documentId, version.id),
    });
  }

  return result;
}

export async function resolveTaskDocumentReferencePresentations(
  ctx: WorkspaceDocumentAccessContext,
  rows: readonly TaskReferenceRow[],
): Promise<Map<string, WorkspaceVersionReferencePresentation>> {
  const result = new Map<string, WorkspaceVersionReferencePresentation>();
  if (rows.length === 0) return result;

  const exactRows: RequirementReferenceRow[] = [];
  const legacyRows: TaskReferenceRow[] = [];

  for (const row of rows) {
    if (
      row.workspaceDocumentVersionId &&
      (row.versionBinding === TaskDocumentReferenceVersionBinding.EXACT ||
        row.versionBinding === TaskDocumentReferenceVersionBinding.LEGACY_SINGLE_VERSION)
    ) {
      exactRows.push({
        referenceId: row.referenceId,
        workspaceDocumentVersionId: row.workspaceDocumentVersionId,
      });
    } else if (
      row.versionBinding === TaskDocumentReferenceVersionBinding.LEGACY_UNRESOLVED &&
      row.documentId
    ) {
      legacyRows.push(row);
    } else {
      result.set(row.referenceId, restrictedVersionReferencePresentation(row.referenceId));
    }
  }

  const exactPresentations = await resolveExactVersionReferencePresentations(ctx, exactRows);
  for (const [id, presentation] of exactPresentations) {
    result.set(id, presentation);
  }

  if (legacyRows.length > 0) {
    const legacyDocumentIds = legacyRows
      .map((r) => r.documentId)
      .filter((id): id is string => Boolean(id));
    const readableLegacy = await filterReadableWorkspaceDocumentIds(ctx, legacyDocumentIds);
    const docs = await prisma.workspaceDocument.findMany({
      where: { tenantId: ctx.tenantId, id: { in: legacyDocumentIds } },
      select: {
        id: true,
        name: true,
        status: true,
        archivedAt: true,
        trashedAt: true,
      },
    });
    const docById = new Map(docs.map((d) => [d.id, d]));

    for (const row of legacyRows) {
      const documentId = row.documentId;
      if (!documentId || !readableLegacy.has(documentId)) {
        result.set(row.referenceId, restrictedVersionReferencePresentation(row.referenceId));
        continue;
      }
      const doc = docById.get(documentId);
      if (!doc) {
        result.set(row.referenceId, restrictedVersionReferencePresentation(row.referenceId));
        continue;
      }
      const lifecycle: WorkspaceDocumentLifecycleState = deriveWorkspaceDocumentLifecycle(doc);
      result.set(row.referenceId, {
        accessible: "legacy_unresolved",
        referenceId: row.referenceId,
        documentId,
        documentTitle: doc.name,
        documentLifecycle: lifecycle,
        message: LEGACY_UNRESOLVED_MESSAGE,
      });
    }
  }

  return result;
}
