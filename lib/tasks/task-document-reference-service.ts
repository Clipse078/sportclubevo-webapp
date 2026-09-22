/**
 * AUFGABEN-06D / WORKSPACE-07 — Task ↔ WorkspaceDocumentVersion supporting references.
 */

import { TaskContextType, TaskDocumentReferenceVersionBinding } from "@prisma/client";
import { writeAuditRecord } from "@/lib/audit/audit-record";
import { prisma } from "@/lib/db/prisma";
import {
  searchWorkspaceDocumentsForTaskLink,
  WORKSPACE_DOCUMENT_LINKABLE_ERROR,
  type WorkspaceDocumentPickerOption,
} from "@/lib/workspace/document-access";
import {
  resolveTaskDocumentReferencePresentations,
  type TaskReferenceRow,
} from "@/lib/workspace/reference/resolve-workspace-version-references";
import type { WorkspaceVersionReferencePresentation } from "@/lib/workspace/reference/workspace-version-reference-presentation";
import {
  listAuthorizedWorkspaceDocumentVersions,
  resolveWorkspaceDocumentVersionForLink,
  WorkspaceVersionLinkValidationError,
} from "@/lib/workspace/reference/workspace-version-link-validation";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskForbiddenError, TaskValidationError } from "./errors";
import {
  requireVisibleTask,
  taskAuthorizationFromRow,
  type VisibleTaskRow,
} from "./task-access";
import { canManageTask, hasTaskPermission } from "./visibility";
import type { TaskAuthorizationRecord } from "./task-authorization";
import type { TaskServiceContext } from "./types";

export type TaskDocumentReferenceDto = {
  referenceId: string;
  presentation: WorkspaceVersionReferencePresentation;
  linkedAt: string;
};

export function canEditTaskDocumentReferences(
  ctx: TaskServiceContext,
  task: TaskAuthorizationRecord,
): boolean {
  const isCreator = task.createdByUserId === ctx.userId;
  const canManage = canManageTask(ctx, task);
  const canCreate = hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE);
  return canManage || (isCreator && canCreate);
}

function assertCanEditTaskDocumentReferences(
  ctx: TaskServiceContext,
  task: TaskAuthorizationRecord,
): void {
  if (!canEditTaskDocumentReferences(ctx, task)) {
    throw new TaskForbiddenError("Dokumentverknüpfungen dürfen nicht bearbeitet werden.");
  }
}

function isPrimaryDocumentContext(task: {
  contextType: TaskContextType | null;
  contextId: string | null;
}): boolean {
  return task.contextType === TaskContextType.DOCUMENT && Boolean(task.contextId);
}

function assertNotPrimaryDocumentDuplicate(
  task: { contextType: TaskContextType | null; contextId: string | null },
  documentId: string,
): void {
  if (
    isPrimaryDocumentContext(task) &&
    task.contextId?.trim() === documentId
  ) {
    throw new TaskValidationError(
      "Dieses Dokument ist bereits als primärer Kontext verknüpft.",
    );
  }
}

function mapReferenceRows(
  references: {
    id: string;
    documentId: string | null;
    workspaceDocumentVersionId: string | null;
    versionBinding: TaskDocumentReferenceVersionBinding;
    createdAt: Date;
  }[],
): { dtos: Omit<TaskDocumentReferenceDto, "presentation">[]; rows: TaskReferenceRow[] } {
  const dtos: Omit<TaskDocumentReferenceDto, "presentation">[] = [];
  const rows: TaskReferenceRow[] = [];

  for (const row of references) {
    dtos.push({
      referenceId: row.id,
      linkedAt: row.createdAt.toISOString(),
    });
    rows.push({
      referenceId: row.id,
      documentId: row.documentId,
      workspaceDocumentVersionId: row.workspaceDocumentVersionId,
      versionBinding: row.versionBinding,
    });
  }

  return { dtos, rows };
}

export async function listTaskDocumentReferencesForVisibleTask(
  ctx: TaskServiceContext,
  visibleTask: VisibleTaskRow,
): Promise<TaskDocumentReferenceDto[]> {
  const taskId = visibleTask.id;
  const references = await prisma.taskDocumentReference.findMany({
    where: { tenantId: ctx.tenantId, taskId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      documentId: true,
      workspaceDocumentVersionId: true,
      versionBinding: true,
      createdAt: true,
    },
  });

  if (references.length === 0) return [];

  const { dtos, rows } = mapReferenceRows(references);
  const presentations = await resolveTaskDocumentReferencePresentations(ctx, rows);

  return dtos.map((dto) => ({
    ...dto,
    presentation:
      presentations.get(dto.referenceId) ??
      ({ accessible: false, referenceId: dto.referenceId } satisfies WorkspaceVersionReferencePresentation),
  }));
}

export async function listTaskDocumentReferences(
  ctx: TaskServiceContext,
  taskId: string,
): Promise<TaskDocumentReferenceDto[]> {
  const visibleTask = await requireVisibleTask(ctx, taskId);
  return listTaskDocumentReferencesForVisibleTask(ctx, visibleTask);
}

export type LinkTaskDocumentVersionInput = {
  documentId: string;
  workspaceDocumentVersionId?: string | null;
};

export async function linkTaskDocument(
  ctx: TaskServiceContext,
  taskId: string,
  input: LinkTaskDocumentVersionInput | string,
): Promise<void> {
  const linkInput: LinkTaskDocumentVersionInput =
    typeof input === "string" ? { documentId: input } : input;

  const normalizedDocumentId = linkInput.documentId.trim();
  if (!normalizedDocumentId) {
    throw new TaskValidationError("documentId is required");
  }

  const task = await requireVisibleTask(ctx, taskId);
  const authRecord = taskAuthorizationFromRow(task);
  assertCanEditTaskDocumentReferences(ctx, authRecord);
  assertNotPrimaryDocumentDuplicate(task, normalizedDocumentId);

  let resolved;
  try {
    resolved = await resolveWorkspaceDocumentVersionForLink(ctx, {
      documentId: normalizedDocumentId,
      workspaceDocumentVersionId: linkInput.workspaceDocumentVersionId,
    });
  } catch (error) {
    if (error instanceof WorkspaceVersionLinkValidationError) {
      throw new TaskValidationError(WORKSPACE_DOCUMENT_LINKABLE_ERROR);
    }
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT "id" FROM "WorkspaceDocument"
      WHERE "id" = ${resolved.documentId} AND "tenantId" = ${ctx.tenantId}
      FOR UPDATE
    `;

    const created = await tx.taskDocumentReference.createMany({
      data: [
        {
          tenantId: ctx.tenantId,
          taskId,
          workspaceDocumentVersionId: resolved.workspaceDocumentVersionId,
          versionBinding: TaskDocumentReferenceVersionBinding.EXACT,
          documentId: null,
          createdByUserId: ctx.userId,
        },
      ],
      skipDuplicates: true,
    });

    if (created.count > 0) {
      await writeAuditRecord(tx, {
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        moduleKey: "tasks",
        entityType: "Task",
        entityId: taskId,
        action: "TASK_DOCUMENT_LINKED",
        afterJson: {
          documentId: resolved.documentId,
          workspaceDocumentVersionId: resolved.workspaceDocumentVersionId,
        },
      });
    }
  });
}

export async function unlinkTaskDocumentReference(
  ctx: TaskServiceContext,
  taskId: string,
  referenceId: string,
): Promise<void> {
  const normalizedReferenceId = referenceId.trim();
  if (!normalizedReferenceId) {
    throw new TaskValidationError("referenceId is required");
  }

  const task = await requireVisibleTask(ctx, taskId);
  assertCanEditTaskDocumentReferences(ctx, taskAuthorizationFromRow(task));

  const existing = await prisma.taskDocumentReference.findFirst({
    where: {
      id: normalizedReferenceId,
      tenantId: ctx.tenantId,
      taskId,
    },
    select: {
      id: true,
      documentId: true,
      workspaceDocumentVersionId: true,
    },
  });

  if (!existing) return;

  await prisma.taskDocumentReference.deleteMany({
    where: {
      tenantId: ctx.tenantId,
      taskId,
      id: normalizedReferenceId,
    },
  });

  await writeAuditRecord(prisma, {
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    moduleKey: "tasks",
    entityType: "Task",
    entityId: taskId,
    action: "TASK_DOCUMENT_UNLINKED",
    afterJson: {
      referenceId: normalizedReferenceId,
      documentId: existing.documentId,
      workspaceDocumentVersionId: existing.workspaceDocumentVersionId,
    },
  });
}

/** @deprecated Prefer unlinkTaskDocumentReference(referenceId). Legacy documentId unlink for transitional rows. */
export async function unlinkTaskDocument(
  ctx: TaskServiceContext,
  taskId: string,
  documentIdOrReferenceId: string,
): Promise<void> {
  const key = documentIdOrReferenceId.trim();
  if (!key) {
    throw new TaskValidationError("referenceId is required");
  }

  const byReference = await prisma.taskDocumentReference.findFirst({
    where: { id: key, tenantId: ctx.tenantId, taskId },
    select: { id: true },
  });
  if (byReference) {
    await unlinkTaskDocumentReference(ctx, taskId, key);
    return;
  }

  const task = await requireVisibleTask(ctx, taskId);
  assertCanEditTaskDocumentReferences(ctx, taskAuthorizationFromRow(task));

  const deleted = await prisma.taskDocumentReference.deleteMany({
    where: {
      tenantId: ctx.tenantId,
      taskId,
      documentId: key,
      workspaceDocumentVersionId: null,
    },
  });

  if (deleted.count > 0) {
    await writeAuditRecord(prisma, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      moduleKey: "tasks",
      entityType: "Task",
      entityId: taskId,
      action: "TASK_DOCUMENT_UNLINKED",
      afterJson: { documentId: key },
    });
  }
}

export async function searchWorkspaceDocumentsForTaskReferenceLink(
  ctx: TaskServiceContext,
  taskId: string,
  query: string,
  limit?: number,
): Promise<WorkspaceDocumentPickerOption[]> {
  const task = await requireVisibleTask(ctx, taskId);
  assertCanEditTaskDocumentReferences(ctx, taskAuthorizationFromRow(task));
  return searchWorkspaceDocumentsForTaskLink(ctx, query, limit);
}

export async function listWorkspaceDocumentVersionsForTaskReferenceLink(
  ctx: TaskServiceContext,
  taskId: string,
  documentId: string,
): Promise<
  | {
      ok: true;
      currentVersionId: string | null;
      versions: { id: string; versionNumber: number; filename: string; createdAt: string }[];
    }
  | { ok: false }
> {
  const task = await requireVisibleTask(ctx, taskId);
  assertCanEditTaskDocumentReferences(ctx, taskAuthorizationFromRow(task));

  return listAuthorizedWorkspaceDocumentVersions(ctx, documentId);
}
