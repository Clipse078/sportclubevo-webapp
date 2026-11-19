import { communicationAttachmentStorage } from "@/lib/communication/attachment-storage";
import { CommunicationAttachmentServiceError } from "@/lib/communication/attachment-service";
import { isCommunicationAttachmentPreviewSupported } from "@/lib/communication/attachment-preview-policy";
import { prisma } from "@/lib/db/prisma";
import {
  canViewMeldung,
  type ClubMeldungAccessContext,
} from "@/lib/club-meldungen/access";

export async function authorizeClubMeldungAttachmentDownload(input: {
  tenantId: string;
  actorUserId: string;
  permissionKeys: readonly string[];
  clubMeldungAttachmentId: string;
}) {
  const row = await prisma.clubMeldungAttachment.findFirst({
    where: { id: input.clubMeldungAttachmentId, tenantId: input.tenantId },
    include: {
      meldung: {
        include: { collaborators: { select: { userId: true } } },
      },
      attachment: {
        select: {
          id: true,
          originalFilename: true,
          sanitizedFilename: true,
          contentType: true,
          sizeBytes: true,
          lifecycleStatus: true,
          scanStatus: true,
          storageKey: true,
        },
      },
    },
  });
  if (!row) {
    return { ok: false as const, status: 404, error: "Anhang nicht gefunden" };
  }

  const ctx: ClubMeldungAccessContext = {
    actorUserId: input.actorUserId,
    permissionKeys: input.permissionKeys,
    collaboratorUserIds: row.meldung.collaborators.map((c) => c.userId),
  };

  if (!canViewMeldung(row.meldung, ctx)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, attachment: row.attachment, link: row };
}

export async function downloadClubMeldungLinkedAttachment(input: {
  tenantId: string;
  actorUserId: string;
  permissionKeys: readonly string[];
  clubMeldungAttachmentId: string;
  disposition?: "attachment" | "inline";
}) {
  const auth = await authorizeClubMeldungAttachmentDownload(input);
  if (!auth.ok) {
    return auth;
  }

  const attachment = auth.attachment;
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

  const inlineRequested = input.disposition === "inline";
  if (inlineRequested && !isCommunicationAttachmentPreviewSupported(attachment.contentType)) {
    throw new CommunicationAttachmentServiceError(
      "INVALID_INPUT",
      "Für diesen Dateityp ist keine Vorschau verfügbar.",
    );
  }

  let download;
  try {
    download = await communicationAttachmentStorage.download({
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

  return {
    ok: true as const,
    stream: download.stream,
    filename: attachment.sanitizedFilename,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
    inline: inlineRequested,
  };
}