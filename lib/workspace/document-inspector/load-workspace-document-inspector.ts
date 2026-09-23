/**
 * W09-02 — aggregate document inspector workflow data (Tasks + Requirements).
 */

import { TaskContextType, TaskDocumentReferenceVersionBinding } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { getRequirementServiceContext } from "@/lib/requirements/server-context";
import { loadContextRelatedTasksPanel } from "@/lib/tasks/load-context-related-tasks-panel";
import { loadContextualTaskCreateView } from "@/lib/tasks/load-contextual-task-create-view";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import { listRequirementsForWorkspaceDocument } from "@/lib/requirements/list-requirements-for-workspace-document";
import { canReadWorkspaceDocument } from "@/lib/workspace/document-access";
import { resolveContextualTaskCreateEligibility } from "@/lib/tasks/contextual-task-eligibility";
import { canCreateRequirement as canCreateRequirementPermission } from "@/lib/requirements/requirement-authorization";
import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";
import type {
  DocumentInspectorRequirementsSectionDto,
  DocumentInspectorTasksSectionDto,
  DocumentInspectorWorkflowCapabilitiesDto,
  WorkspaceDocumentInspectorDocumentDto,
  WorkspaceDocumentInspectorPayloadDto,
} from "./document-inspector-dto";

function serializeDocument(
  doc: WorkspaceDocumentListItemDto,
): WorkspaceDocumentInspectorDocumentDto {
  return {
    id: doc.id,
    folderId: doc.folderId,
    name: doc.name,
    status: doc.status,
    currentVersionId: doc.currentVersionId,
    createdAt:
      doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt:
      doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
    currentVersion: doc.currentVersion
      ? {
          id: doc.currentVersion.id,
          versionNumber: doc.currentVersion.versionNumber,
          filename: doc.currentVersion.filename,
          mimeType: doc.currentVersion.mimeType,
          sizeBytes: doc.currentVersion.sizeBytes,
          createdAt:
            doc.currentVersion.createdAt instanceof Date
              ? doc.currentVersion.createdAt.toISOString()
              : String(doc.currentVersion.createdAt),
        }
      : null,
    canManageAccess: Boolean(doc.canManageAccess),
    canEditDocument: Boolean(doc.canEditDocument),
  };
}

async function resolveTaskVersionLabels(
  tenantId: string,
  documentId: string,
  taskIds: string[],
): Promise<Map<string, string | null>> {
  if (taskIds.length === 0) return new Map();

  const refs = await prisma.taskDocumentReference.findMany({
    where: {
      tenantId,
      documentId,
      taskId: { in: taskIds },
    },
    select: {
      taskId: true,
      workspaceDocumentVersionId: true,
      versionBinding: true,
      workspaceDocumentVersion: { select: { versionNumber: true } },
    },
  });

  const labels = new Map<string, string | null>();
  for (const taskId of taskIds) {
    labels.set(taskId, null);
  }

  for (const ref of refs) {
    const versionNumber = ref.workspaceDocumentVersion?.versionNumber;
    if (ref.versionBinding === TaskDocumentReferenceVersionBinding.EXACT && versionNumber != null) {
      labels.set(ref.taskId, `Version ${versionNumber}`);
      continue;
    }
    if (
      ref.versionBinding === TaskDocumentReferenceVersionBinding.LEGACY_SINGLE_VERSION &&
      versionNumber != null
    ) {
      labels.set(ref.taskId, `Version ${versionNumber}`);
      continue;
    }
    if (ref.versionBinding === TaskDocumentReferenceVersionBinding.LEGACY_UNRESOLVED) {
      labels.set(ref.taskId, "Ältere Referenz");
    }
  }

  const [currentVersion, primaryContextTaskIds] = await Promise.all([
    prisma.workspaceDocument.findFirst({
      where: { id: documentId, tenantId },
      select: { currentVersion: { select: { versionNumber: true } } },
    }),
    prisma.task.findMany({
      where: {
        tenantId,
        id: { in: taskIds },
        contextType: TaskContextType.DOCUMENT,
        contextId: documentId,
      },
      select: { id: true },
    }),
  ]);

  const currentLabel = currentVersion?.currentVersion
    ? `Aktuelle Version (v${currentVersion.currentVersion.versionNumber})`
    : null;

  if (currentLabel) {
    for (const row of primaryContextTaskIds) {
      if (labels.get(row.id) === null) {
        labels.set(row.id, currentLabel);
      }
    }
  }

  return labels;
}

async function loadTasksSection(
  documentId: string,
  locale: string,
  timeZone: string,
): Promise<DocumentInspectorTasksSectionDto> {
  try {
    const ctx = await getTaskServiceContext();
    if (!ctx) return { visible: false };

    const panel = await loadContextRelatedTasksPanel(ctx, TaskContextType.DOCUMENT, documentId);
    if (!panel) return { visible: false };

    const versionLabels = await resolveTaskVersionLabels(
      ctx.tenantId,
      documentId,
      panel.tasks.map((t) => t.id),
    );

    let createDialogProps = null;
    if (panel.canCreate) {
      const createView = await loadContextualTaskCreateView(
        ctx,
        TaskContextType.DOCUMENT,
        documentId,
        locale,
        timeZone,
      );
      if (createView?.canCreate) {
        createDialogProps = {
          contextType: createView.contextType,
          contextId: createView.contextId,
          presentation: createView.presentation,
          orgUnitOptions: createView.orgUnitOptions,
          timeZone: createView.timeZone,
          tenantWideVisibility: createView.tenantWideVisibility,
        };
      }
    }

    return {
      visible: true,
      loadError: false,
      count: panel.actionableCount,
      hasMore: panel.hasMore,
      canCreate: panel.canCreate,
      createDialogProps,
      tasks: panel.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueAt: task.dueAt,
        href: taskWorkspaceHref(task.id),
        versionLabel: versionLabels.get(task.id) ?? null,
      })),
    };
  } catch {
    return {
      visible: true,
      loadError: true,
      count: 0,
      tasks: [],
      hasMore: false,
      canCreate: false,
      createDialogProps: null,
    };
  }
}

async function loadRequirementsSection(
  documentId: string,
): Promise<DocumentInspectorRequirementsSectionDto> {
  try {
    const ctx = await getRequirementServiceContext();
    if (!ctx) return { visible: false };

    const result = await listRequirementsForWorkspaceDocument(ctx, documentId);
    if (!result.visible) return { visible: false };

    return {
      visible: true,
      loadError: false,
      count: result.count,
      canCreate: result.canCreate,
      requirements: result.requirements.map((row) => ({
        requirementId: row.requirementId,
        title: row.title,
        status: row.status,
        href: row.href,
        linkedVersionLabel: `v${row.linkedVersionNumber}`,
      })),
    };
  } catch {
    return {
      visible: true,
      loadError: true,
      count: 0,
      requirements: [],
      canCreate: false,
    };
  }
}

export async function resolveDocumentWorkflowCapabilities(
  documentId: string,
): Promise<DocumentInspectorWorkflowCapabilitiesDto> {
  const [taskCtx, reqCtx] = await Promise.all([
    getTaskServiceContext(),
    getRequirementServiceContext(),
  ]);

  let canCreateTask = false;
  if (taskCtx) {
    const eligibility = await resolveContextualTaskCreateEligibility(
      taskCtx,
      TaskContextType.DOCUMENT,
      documentId,
    );
    canCreateTask = eligibility.canCreate;
  }

  let canCreateRequirement = false;
  if (reqCtx) {
    const readable = await canReadWorkspaceDocument(reqCtx, documentId);
    canCreateRequirement = readable && canCreateRequirementPermission(reqCtx);
  }

  return { canCreateTask, canCreateRequirement };
}

export async function loadWorkspaceDocumentInspectorPayload(input: {
  document: WorkspaceDocumentListItemDto;
  folderName: string;
  locale: string;
  timeZone: string;
}): Promise<WorkspaceDocumentInspectorPayloadDto> {
  const documentId = input.document.id;
  const [tasks, requirements, capabilities] = await Promise.all([
    loadTasksSection(documentId, input.locale, input.timeZone),
    loadRequirementsSection(documentId),
    resolveDocumentWorkflowCapabilities(documentId),
  ]);

  return {
    document: serializeDocument(input.document),
    folderName: input.folderName,
    locale: input.locale,
    timeZone: input.timeZone,
    capabilities,
    tasks,
    requirements,
  };
}
