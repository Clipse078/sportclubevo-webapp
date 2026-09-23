"use client";

import { WorkspaceUploadButton } from "@/components/admin/workspace/WorkspaceUploadButton";
import { WorkspaceUploadDropzone } from "@/components/admin/workspace/WorkspaceUploadDropzone";
import { WorkspaceUploadProvider } from "@/components/admin/workspace/WorkspaceUploadContext";
import { WorkspaceUploadProgress } from "@/components/admin/workspace/WorkspaceUploadProgress";

type WorkspaceUploadControlsProps = {
  folderId: string;
  folderName?: string;
  canUpload?: boolean;
  compact?: boolean;
  onUploadComplete?: (documentId: string | null) => void;
};

export function WorkspaceUploadControls({
  folderId,
  folderName = "",
  canUpload = true,
  compact = false,
  onUploadComplete,
}: WorkspaceUploadControlsProps) {
  return (
    <WorkspaceUploadProvider
      folderId={folderId}
      folderName={folderName}
      canUpload={canUpload}
      onUploadComplete={onUploadComplete}
    >
      {compact ? (
        <>
          <WorkspaceUploadButton />
          <WorkspaceUploadProgress />
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <WorkspaceUploadButton />
          </div>
          <WorkspaceUploadDropzone folderName={folderName} expanded />
          <WorkspaceUploadProgress />
        </div>
      )}
    </WorkspaceUploadProvider>
  );
}
