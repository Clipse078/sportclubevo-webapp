"use client";

import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { useWorkspaceUploadContext } from "./WorkspaceUploadContext";

type WorkspaceUploadButtonProps = {
  folderId?: string;
  disabled?: boolean;
  onUploadComplete?: (documentId: string | null) => void;
};

/**
 * Legacy upload button — prefer WorkspaceCommandBar + WorkspaceUploadProvider.
 */
export function WorkspaceUploadButton({
  disabled = false,
}: WorkspaceUploadButtonProps) {
  const t = useTranslations("Workspace.upload");
  const { canUpload, isUploading, openFilePicker } = useWorkspaceUploadContext();

  return (
    <Button
      type="button"
      variant="primary"
      loading={isUploading}
      disabled={disabled || !canUpload}
      iconLeft={!isUploading ? <Upload className="h-4 w-4" /> : undefined}
      onClick={openFilePicker}
      aria-label={t("buttonLabelWithIcon")}
    >
      {isUploading ? t("uploadingLabel") : t("buttonLabelWithIcon")}
    </Button>
  );
}
