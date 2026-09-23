import type {
  WorkspaceDocumentStatus,
  WorkspaceDocumentVersionStatus,
} from "@prisma/client";
import type { WorkspaceVersionScanPublicDto } from "@/lib/workspace/malware-scan/scan-dto";

export type WorkspaceDocumentVersionDto = {
  id: string;
  documentId: string;
  versionNumber: number;
  status: WorkspaceDocumentVersionStatus;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  storageUrl: string | null;
  storageProvider: string;
  checksum: string | null;
  changeNote: string | null;
  createdByUserId: string | null;
  createdAt: Date;
};

export type WorkspaceDocumentDto = {
  id: string;
  tenantId: string;
  folderId: string | null;
  name: string;
  status: WorkspaceDocumentStatus;
  currentVersionId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  currentVersion: WorkspaceDocumentVersionDto | null;
};

export type CreateWorkspaceDocumentInput = {
  documentId: string;
  versionId: string;
  tenantId: string;
  folderId: string | null;
  name: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  storageUrl?: string | null;
  storageProvider?: string;
  checksum?: string | null;
  changeNote?: string | null;
  actorUserId: string;
};
export type WorkspaceDocumentListVersionDto = {
  id: string;
  versionNumber: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  /** W09-03 — user-facing scan / delivery availability (no secrets). */
  scan?: WorkspaceVersionScanPublicDto;
};

export type WorkspaceDocumentListItemDto = {
  id: string;
  folderId: string | null;
  name: string;
  status: WorkspaceDocumentStatus;
  currentVersionId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  currentVersion: WorkspaceDocumentListVersionDto | null;
  /** WORKSPACE-03 — resource-level capabilities (computed server-side, not per-row API). */
  canManageAccess?: boolean;
  canUpload?: boolean;
  canEditDocument?: boolean;
};

export type ListWorkspaceDocumentsInput = {
  tenantId: string;
  folderId?: string | null;
  /** WORKSPACE-02 — only documents the actor may VIEW (query-boundary enforcement). */
  authorizedDocumentIds: readonly string[];
};

export type GetWorkspaceDocumentForDownloadInput = {
  tenantId: string;
  documentId: string;
};

export type WorkspaceDocumentDownloadDto = {
  documentId: string;
  documentName: string;
  versionId: string;
  versionNumber: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  storageProvider: string;
  checksum: string | null;
};
export type GetWorkspaceDocumentVersionsInput = {
  tenantId: string;
  actorUserId: string;
  documentId: string;
};

export type WorkspaceDocumentVersionHistoryItemDto = {
  id: string;
  versionNumber: number;
  createdAt: Date;
  createdByUserId: string | null;
  createdByName: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  status: WorkspaceDocumentVersionStatus;
  isCurrent: boolean;
  restoredFromVersionId: string | null;
  scan?: WorkspaceVersionScanPublicDto;
};

/** Immutable acknowledgement reference target (WORKSPACE-05 readiness). */
export type WorkspaceDocumentVersionRefDto = {
  tenantId: string;
  documentId: string;
  versionId: string;
};
