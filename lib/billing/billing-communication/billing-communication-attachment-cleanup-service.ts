/**
 * Removes abandoned STAGED compose attachments (physical blob + metadata).
 *
 * Residual reconciliation: orphaned blobs without DB rows or READY rows without blobs
 * are not scanned globally; failures are logged for operator follow-up.
 */
import {
  deleteStagedBillingCommunicationAttachmentById,
  listStaleStagedBillingCommunicationAttachments,
} from "./billing-communication-attachment-repository";
import {
  getBillingCommunicationStagedAttachmentMaxAgeMs,
  getBillingCommunicationStagedCleanupBatchSize,
} from "./billing-communication-attachment-cleanup-config";
import {
  billingCommunicationAttachmentStorage,
  type BillingCommunicationAttachmentStorage,
} from "./billing-communication-attachment-storage";

export type BillingCommunicationAttachmentCleanupSummary = {
  attempted: number;
  removed: number;
  storageFailures: number;
  dbFailures: number;
  skippedNotStaged: number;
};

export async function runStaleStagedBillingCommunicationAttachmentCleanup(input?: {
  now?: Date;
  storage?: BillingCommunicationAttachmentStorage;
}): Promise<BillingCommunicationAttachmentCleanupSummary> {
  const now = input?.now ?? new Date();
  const storage = input?.storage ?? billingCommunicationAttachmentStorage;
  const maxAgeMs = getBillingCommunicationStagedAttachmentMaxAgeMs();
  const batchSize = getBillingCommunicationStagedCleanupBatchSize();
  const olderThan = new Date(now.getTime() - maxAgeMs);

  const candidates = await listStaleStagedBillingCommunicationAttachments({
    olderThan,
    limit: batchSize,
  });

  const summary: BillingCommunicationAttachmentCleanupSummary = {
    attempted: candidates.length,
    removed: 0,
    storageFailures: 0,
    dbFailures: 0,
    skippedNotStaged: 0,
  };

  for (const row of candidates) {
    if (row.lifecycleStatus !== "STAGED" || row.billingCommunicationId !== null) {
      summary.skippedNotStaged += 1;
      continue;
    }

    try {
      await storage.delete(row.storageKey);
    } catch (error) {
      summary.storageFailures += 1;
      console.warn("[billing/attachment-cleanup] storage delete failed", {
        attachmentId: row.id,
        tenantId: row.tenantId,
        message: error instanceof Error ? error.message : "unknown",
      });
      continue;
    }

    try {
      const deleted = await deleteStagedBillingCommunicationAttachmentById({
        id: row.id,
        tenantId: row.tenantId,
      });
      if (!deleted) {
        summary.skippedNotStaged += 1;
        continue;
      }
      summary.removed += 1;
      console.info("[billing/attachment-cleanup] removed stale staged attachment", {
        attachmentId: row.id,
        tenantId: row.tenantId,
      });
    } catch (error) {
      summary.dbFailures += 1;
      console.warn("[billing/attachment-cleanup] metadata delete failed", {
        attachmentId: row.id,
        tenantId: row.tenantId,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return summary;
}
