/**
 * W09-02 — serializable document inspector workflow DTOs (no Prisma models on client).
 */

import type { TaskContextType, TaskPriority, TaskStatus } from "@prisma/client";
import type { RequirementStatus } from "@prisma/client";
import type { ContextualTaskCreateViewDto } from "@/lib/tasks/load-contextual-task-create-view";
import type { ContextualTaskCreateDialogProps } from "@/components/admin/aufgaben/contextual/ContextualTaskCreateDialog";
import type { WorkspaceVersionScanPublicDto } from "@/lib/workspace/malware-scan/scan-dto";
import type { WorkspaceVersionUploaderPublicDto } from "@/lib/workspace/version/version-uploader-public-dto";

export type ContextualTaskCreateDialogSeedProps = Omit<
  ContextualTaskCreateDialogProps,
  "open" | "onOpenChange"
>;

export type WorkspaceDocumentInspectorDocumentDto = {
  id: string;
  folderId: string | null;
  name: string;
  status: string;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: {
    id: string;
    versionNumber: number;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    uploader: WorkspaceVersionUploaderPublicDto;
    scan?: WorkspaceVersionScanPublicDto;
  } | null;
  canManageAccess: boolean;
  canEditDocument: boolean;
};

export type DocumentInspectorTaskRowDto = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  href: string;
  /** User-facing version binding when linked via document reference. */
  versionLabel: string | null;
};

export type DocumentInspectorTasksSectionDto =
  | {
      visible: true;
      count: number;
      tasks: DocumentInspectorTaskRowDto[];
      hasMore: boolean;
      canCreate: boolean;
      createDialogProps: ContextualTaskCreateDialogSeedProps | null;
      loadError: false;
    }
  | { visible: false }
  | { visible: true; loadError: true; count: 0; tasks: []; canCreate: false; hasMore: false; createDialogProps: null };

export type DocumentInspectorRequirementRowDto = {
  requirementId: string;
  title: string;
  status: RequirementStatus;
  href: string;
  linkedVersionLabel: string;
};

export type DocumentInspectorRequirementsSectionDto =
  | {
      visible: true;
      count: number;
      requirements: DocumentInspectorRequirementRowDto[];
      canCreate: boolean;
      loadError: false;
    }
  | { visible: false }
  | {
      visible: true;
      loadError: true;
      count: 0;
      requirements: [];
      canCreate: false;
    };

export type DocumentInspectorWorkflowCapabilitiesDto = {
  canCreateTask: boolean;
  canCreateRequirement: boolean;
};

export type WorkspaceDocumentInspectorPayloadDto = {
  document: WorkspaceDocumentInspectorDocumentDto;
  folderName: string;
  locale: string;
  timeZone: string;
  capabilities: DocumentInspectorWorkflowCapabilitiesDto;
  tasks: DocumentInspectorTasksSectionDto;
  requirements: DocumentInspectorRequirementsSectionDto;
};

export type SerializedContextualTaskCreateView = Omit<
  ContextualTaskCreateViewDto,
  never
> & {
  contextType: TaskContextType;
};
