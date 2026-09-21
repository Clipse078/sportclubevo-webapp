/**
 * AUFGABEN-06D — Task ↔ WorkspaceDocument supporting references.
 */

import { TaskContextType } from "@prisma/client";
import { writeAuditRecord } from "@/lib/audit/audit-record";
import { prisma } from "@/lib/db/prisma";
import {
  assertWorkspaceDocumentLinkable,
  resolveWorkspaceDocumentPresentations,
  searchWorkspaceDocumentsForTaskLink,
  WORKSPACE_DOCUMENT_LINKABLE_ERROR,
  type WorkspaceDocumentPickerOption,
  type WorkspaceDocumentPresentation,
} from "@/lib/workspace/document-access";
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
  documentId: string;
  presentation: WorkspaceDocumentPresentation;
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


export async function listTaskDocumentReferencesForVisibleTask(
  ctx: TaskServiceContext,
  visibleTask: VisibleTaskRow,
): Promise<TaskDocumentReferenceDto[]> {
  const taskId = visibleTask.id;
  const references = await prisma.taskDocumentReference.findMany({
    where: { tenantId: ctx.tenantId, taskId },
    orderBy: { createdAt: "asc" },
    select: { id: true, documentId: true, createdAt: true },
  });

  if (references.length === 0) return [];

  const documentIds = references.map((row) => row.documentId);
  const presentations = await resolveWorkspaceDocumentPresentations(ctx, documentIds);

  return references.map((row) => ({
    referenceId: row.id,
    documentId: row.documentId,
    presentation:
      presentations.get(row.documentId) ??
      ({ access: "restricted", documentId: row.documentId } satisfies WorkspaceDocumentPresentation),
    linkedAt: row.createdAt.toISOString(),
  }));
}

export async function listTaskDocumentReferences(
  ctx: TaskServiceContext,
  taskId: string,
): Promise<TaskDocumentReferenceDto[]> {
  const visibleTask = await requireVisibleTask(ctx, taskId);
  return listTaskDocumentReferencesForVisibleTask(ctx, visibleTask);
}

export async function linkTaskDocument(
  ctx: TaskServiceContext,
  taskId: string,
  documentId: string,
): Promise<void> {
  const normalizedDocumentId = documentId.trim();
  if (!normalizedDocumentId) {
    throw new TaskValidationError("documentId is required");
  }

  const task = await requireVisibleTask(ctx, taskId);
  const authRecord = taskAuthorizationFromRow(task);
  assertCanEditTaskDocumentReferences(ctx, authRecord);
  assertNotPrimaryDocumentDuplicate(task, normalizedDocumentId);

  try {
    await assertWorkspaceDocumentLinkable(ctx, normalizedDocumentId);
  } catch {
    throw new TaskValidationError(WORKSPACE_DOCUMENT_LINKABLE_ERROR);
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.taskDocumentReference.createMany({
      data: [
        {
          tenantId: ctx.tenantId,
          taskId,
          documentId: normalizedDocumentId,
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
        afterJson: { documentId: normalizedDocumentId },
      });
    }
  });
}

export async function unlinkTaskDocument(
  ctx: TaskServiceContext,
  taskId: string,
  documentId: string,
): Promise<void> {
  const normalizedDocumentId = documentId.trim();
  if (!normalizedDocumentId) {
    throw new TaskValidationError("documentId is required");
  }

  const task = await requireVisibleTask(ctx, taskId);
  assertCanEditTaskDocumentReferences(ctx, taskAuthorizationFromRow(task));

  const deleted = await prisma.taskDocumentReference.deleteMany({
    where: {
      tenantId: ctx.tenantId,
      taskId,
      documentId: normalizedDocumentId,
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
      afterJson: { documentId: normalizedDocumentId },
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
