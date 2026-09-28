/**
 * Removes abandoned READY CommunicationAttachment rows with no canonical links.
 * Storage deletion uses the communication private blob store (mockable in tests).
 */
import { prisma } from "@/lib/db/prisma";
import {
  communicationAttachmentStorage,
  type CommunicationAttachmentStorage,
} from "@/lib/communication/attachment-storage";
import {
  getCommunicationUnlinkedAttachmentCleanupBatchSize,
  getCommunicationUnlinkedAttachmentMaxAgeMs,
} from "@/lib/communication/attachment-cleanup-config";

export type CommunicationAttachmentCleanupSummary = {
  attempted: number;
  removed: number;
  storageFailures: number;
  dbFailures: number;
  skippedLinked: number;
  skippedNotReady: number;
};

type CleanupCandidate = {
  id: string;
  tenantId: string;
  storageKey: string;
  lifecycleStatus: string;
  _count: {
    messageLinks: number;
    platformCommunicationLinks: number;
    communicationCenterMessageLinks: number;
    personalSignatureAssetLinks: number;
  };
};

export async function listStaleUnlinkedCommunicationAttachments(input: {
  olderThan: Date;
  limit: number;
}): Promise<CleanupCandidate[]> {
  const rows = await prisma.communicationAttachment.findMany({
    where: {
      lifecycleStatus: "READY",
      createdAt: { lt: input.olderThan },
      messageLinks: { none: {} },
      platformCommunicationLinks: { none: {} },
      communicationCenterMessageLinks: { none: {} },
      personalSignatureAssetLinks: { none: {} },
    },
    orderBy: { createdAt: "asc" },
    take: input.limit,
    select: {
      id: true,
      tenantId: true,
      storageKey: true,
      lifecycleStatus: true,
      _count: {
        select: {
          messageLinks: true,
          platformCommunicationLinks: true,
          communicationCenterMessageLinks: true,
          personalSignatureAssetLinks: true,
        },
      },
    },
  });
  return rows;
}

export async function deleteUnlinkedCommunicationAttachmentById(input: {
  id: string;
  tenantId: string;
}): Promise<boolean> {
  const result = await prisma.communicationAttachment.deleteMany({
    where: {
      id: input.id,
      tenantId: input.tenantId,
      lifecycleStatus: "READY",
      messageLinks: { none: {} },
      platformCommunicationLinks: { none: {} },
      communicationCenterMessageLinks: { none: {} },
      personalSignatureAssetLinks: { none: {} },
    },
  });
  return result.count === 1;
}

export async function runStaleUnlinkedCommunicationAttachmentCleanup(input?: {
  now?: Date;
  storage?: CommunicationAttachmentStorage;
}): Promise<CommunicationAttachmentCleanupSummary> {
  const now = input?.now ?? new Date();
  const storage = input?.storage ?? communicationAttachmentStorage;
  const maxAgeMs = getCommunicationUnlinkedAttachmentMaxAgeMs();
  const batchSize = getCommunicationUnlinkedAttachmentCleanupBatchSize();
  const olderThan = new Date(now.getTime() - maxAgeMs);

  const candidates = await listStaleUnlinkedCommunicationAttachments({
    olderThan,
    limit: batchSize,
  });

  const summary: CommunicationAttachmentCleanupSummary = {
    attempted: candidates.length,
    removed: 0,
    storageFailures: 0,
    dbFailures: 0,
    skippedLinked: 0,
    skippedNotReady: 0,
  };

  for (const row of candidates) {
    const linkTotal =
      row._count.messageLinks +
      row._count.platformCommunicationLinks +
      row._count.communicationCenterMessageLinks +
      row._count.personalSignatureAssetLinks;
    if (linkTotal > 0) {
      summary.skippedLinked += 1;
      continue;
    }
    if (row.lifecycleStatus !== "READY") {
      summary.skippedNotReady += 1;
      continue;
    }

    try {
      await storage.delete(row.storageKey);
    } catch (error) {
      summary.storageFailures += 1;
      console.warn("[communication/attachment-cleanup] storage delete failed", {
        attachmentId: row.id,
        tenantId: row.tenantId,
        message: error instanceof Error ? error.message : "unknown",
      });
      continue;
    }

    try {
      const deleted = await deleteUnlinkedCommunicationAttachmentById({
        id: row.id,
        tenantId: row.tenantId,
      });
      if (!deleted) {
        summary.skippedLinked += 1;
        continue;
      }
      summary.removed += 1;
      console.info("[communication/attachment-cleanup] removed stale unlinked attachment", {
        attachmentId: row.id,
        tenantId: row.tenantId,
      });
    } catch (error) {
      summary.dbFailures += 1;
      console.warn("[communication/attachment-cleanup] metadata delete failed", {
        attachmentId: row.id,
        tenantId: row.tenantId,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return summary;
}
