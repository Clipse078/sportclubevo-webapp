import { logAction } from "@/lib/audit/log-action";
import {
  communicationAttachmentStorage,
  type CommunicationAttachmentStorage,
} from "@/lib/communication/attachment-storage";
import {
  CommunicationAttachmentServiceError,
} from "@/lib/communication/attachment-service";
import { authorizeCommunicationAttachmentAccess } from "@/lib/communication/attachment-authorization";
import { isCommunicationAttachmentPreviewSupported } from "@/lib/communication/attachment-preview-policy";

export type DownloadCommunicationAttachmentResult = {
  stream: ReadableStream<Uint8Array>;
  filename: string;
  contentType: string;
  sizeBytes: number;
  inline: boolean;
};

function assertAttachmentDeliverable(attachment: {
  lifecycleStatus: string;
  scanStatus: string;
}): void {
  if (
    attachment.lifecycleStatus !== "READY" ||
    attachment.scanStatus === "QUARANTINED" ||
    attachment.scanStatus === "FAILED"
  ) {
    throw new CommunicationAttachmentServiceError(
      "ATTACHMENT_UNAVAILABLE",
      "Der Anhang ist nicht zum Download freigegeben.",
    );
  }
}

export async function downloadCommunicationAttachment(input: {
  tenantId: string;
  tenantKey?: string;
  actorUserId: string;
  attachmentId: string;
  disposition?: "attachment" | "inline";
  storage?: CommunicationAttachmentStorage;
}): Promise<DownloadCommunicationAttachmentResult> {
  const attachment = await authorizeCommunicationAttachmentAccess({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    actorUserId: input.actorUserId,
    attachmentId: input.attachmentId,
  });

  assertAttachmentDeliverable(attachment);

  const inlineRequested = input.disposition === "inline";
  if (inlineRequested && !isCommunicationAttachmentPreviewSupported(attachment.contentType)) {
    throw new CommunicationAttachmentServiceError(
      "INVALID_INPUT",
      "Für diesen Dateityp ist keine Vorschau verfügbar.",
    );
  }

  let download;
  try {
    download = await (
      input.storage ?? communicationAttachmentStorage
    ).download({
      storageKey: attachment.storageKey,
      filename: attachment.sanitizedFilename,
      contentType: attachment.contentType,
    });
  } catch {
    throw new CommunicationAttachmentServiceError(
      "STORAGE_FAILED",
      "Der Anhang konnte nicht geladen werden.",
    );
  }

  await logAction({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: "communication",
    entityType: "CommunicationAttachment",
    entityId: attachment.id,
    action: inlineRequested
      ? "COMMUNICATION_ATTACHMENT_PREVIEWED"
      : "COMMUNICATION_ATTACHMENT_DOWNLOADED",
    afterJson: {
      filename: attachment.sanitizedFilename,
      contentType: attachment.contentType,
      sizeBytes: attachment.sizeBytes,
    },
  });

  return {
    stream: download.stream,
    filename: attachment.sanitizedFilename,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
    inline: inlineRequested,
  };
}
