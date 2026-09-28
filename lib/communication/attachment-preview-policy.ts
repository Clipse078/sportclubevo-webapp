/**
 * SCE-COMM-EVO-04 — inline preview eligibility (post-authorization only).
 */
import { isWorkspaceInlinePreviewSupported } from "@/lib/workspace/storage/preview-policy";

export function isCommunicationAttachmentPreviewSupported(contentType: string): boolean {
  return isWorkspaceInlinePreviewSupported(contentType);
}
