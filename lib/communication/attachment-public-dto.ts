import type { CommunicationAttachmentScanStatus } from "@prisma/client";
import { isCommunicationAttachmentPreviewSupported } from "@/lib/communication/attachment-preview-policy";

export type PublicCommunicationAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  downloadAvailable: boolean;
  previewAvailable: boolean;
  scanStatus: CommunicationAttachmentScanStatus;
  unavailableReason?: string;
};

export function toPublicCommunicationAttachment(input: {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  lifecycleStatus: string;
  scanStatus: CommunicationAttachmentScanStatus;
  bytesAvailable?: boolean;
}): PublicCommunicationAttachment {
  const bytesAvailable = input.bytesAvailable !== false;
  const lifecycleReady = input.lifecycleStatus === "READY";
  const scanBlocked =
    input.scanStatus === "QUARANTINED" || input.scanStatus === "FAILED";
  const downloadAvailable = bytesAvailable && lifecycleReady && !scanBlocked;
  let unavailableReason: string | undefined;
  if (!bytesAvailable) {
    unavailableReason = "Datei nicht verfügbar";
  } else if (!lifecycleReady) {
    unavailableReason = "Anhang noch nicht bereit";
  } else if (scanBlocked) {
    unavailableReason = "Anhang gesperrt";
  }

  return {
    id: input.id,
    filename: input.filename,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    downloadAvailable,
    previewAvailable:
      downloadAvailable && isCommunicationAttachmentPreviewSupported(input.contentType),
    scanStatus: input.scanStatus,
    unavailableReason,
  };
}
