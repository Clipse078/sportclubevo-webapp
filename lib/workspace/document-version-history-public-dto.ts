import type { WorkspaceDocumentVersionHistoryItemDto } from "@/lib/workspace/document-dto";
import {
  WORKSPACE_VERSION_UPLOADER_UNAVAILABLE,
  type WorkspaceVersionUploaderPublicDto,
} from "@/lib/workspace/version/version-uploader-public-dto";

export type WorkspaceDocumentVersionHistoryPublicItemDto = {
  id: string;
  versionNumber: number;
  createdAt: string;
  uploader: WorkspaceVersionUploaderPublicDto;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  status: WorkspaceDocumentVersionHistoryItemDto["status"];
  isCurrent: boolean;
  restoredFromVersionId: string | null;
  scan?: WorkspaceDocumentVersionHistoryItemDto["scan"];
};

export function serializeWorkspaceDocumentVersionHistoryPublicItem(
  version: WorkspaceDocumentVersionHistoryItemDto,
): WorkspaceDocumentVersionHistoryPublicItemDto {
  const resolvedName = version.createdByName?.trim();
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    createdAt:
      version.createdAt instanceof Date
        ? version.createdAt.toISOString()
        : String(version.createdAt),
    uploader: {
      displayName: resolvedName || WORKSPACE_VERSION_UPLOADER_UNAVAILABLE,
    },
    filename: version.filename,
    mimeType: version.mimeType,
    sizeBytes: version.sizeBytes,
    checksum: version.checksum,
    status: version.status,
    isCurrent: version.isCurrent,
    restoredFromVersionId: version.restoredFromVersionId,
    scan: version.scan,
  };
}
