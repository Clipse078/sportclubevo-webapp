/**
 * W09-07 — client-safe Workspace resource DTOs (web + future mobile BFF).
 */

import type { WorkspaceDocumentStatus } from "@prisma/client";

import type { WorkspaceResourceAvailableActionsDto } from "@/lib/workspace/command/workspace-available-actions";
import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";
import type { WorkspaceVersionScanPublicDto } from "@/lib/workspace/malware-scan/scan-dto";
import type { WorkspaceVersionUploaderPublicDto } from "@/lib/workspace/version/version-uploader-public-dto";

export type WorkspaceDocumentListPublicVersionDto = {
  id: string;
  versionNumber: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  scan?: WorkspaceVersionScanPublicDto;
};

export type WorkspaceDocumentListPublicItemDto = {
  id: string;
  folderId: string | null;
  name: string;
  status: WorkspaceDocumentStatus;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: WorkspaceDocumentListPublicVersionDto | null;
  availableActions: WorkspaceResourceAvailableActionsDto;
};

export type WorkspaceFolderListPublicItemDto = {
  id: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  availableActions: WorkspaceResourceAvailableActionsDto;
};

export type WorkspaceDocumentVersionPublicItemDto = {
  id: string;
  versionNumber: number;
  createdAt: string;
  uploader: WorkspaceVersionUploaderPublicDto;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  isCurrent: boolean;
  scan?: WorkspaceVersionScanPublicDto;
  availableActions: Pick<
    WorkspaceResourceAvailableActionsDto,
    "preview" | "download"
  >;
};

export function serializeWorkspaceDocumentListPublicItem(
  doc: WorkspaceDocumentListItemDto & {
    availableActions: WorkspaceResourceAvailableActionsDto;
  },
): WorkspaceDocumentListPublicItemDto {
  return {
    id: doc.id,
    folderId: doc.folderId,
    name: doc.name,
    status: doc.status,
    currentVersionId: doc.currentVersionId,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : String(doc.updatedAt),
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
          scan: doc.currentVersion.scan,
        }
      : null,
    availableActions: doc.availableActions,
  };
}
