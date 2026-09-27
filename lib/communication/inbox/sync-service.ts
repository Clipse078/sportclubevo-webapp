import { randomUUID } from "node:crypto";
import {
  CommunicationCenterMailboxStatus,
  type CommunicationCenterMailbox,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  COMMUNICATION_CENTER_INBOX_FOLDER_INBOX,
  COMMUNICATION_CENTER_SYNC_BATCH_SIZE,
  COMMUNICATION_CENTER_SYNC_LEASE_MS,
} from "@/lib/communication/inbox/constants";
import { createInboundCommunicationConnector } from "@/lib/communication/inbox/connector/imap/imap-connector";
import { resolveMailboxImapConfig } from "@/lib/communication/inbox/mailbox-service";
import { ingestCommunicationCenterImapMessage } from "@/lib/communication/inbox/ingestion-service";

export type CommunicationCenterSyncSummary = {
  mailboxId: string;
  fetched: number;
  ingested: number;
  duplicate: number;
  failed: number;
  skipped: boolean;
  skipReason?: string;
};

async function claimMailboxSyncLease(mailbox: CommunicationCenterMailbox): Promise<string | null> {
  const now = new Date();
  const token = randomUUID();
  const expiresAt = new Date(now.getTime() + COMMUNICATION_CENTER_SYNC_LEASE_MS);

  const updated = await prisma.communicationCenterMailbox.updateMany({
    where: {
      id: mailbox.id,
      tenantId: mailbox.tenantId,
      OR: [
        { syncLeaseExpiresAt: null },
        { syncLeaseExpiresAt: { lt: now } },
        { syncLeaseToken: mailbox.syncLeaseToken },
      ],
    },
    data: {
      syncLeaseToken: token,
      syncLeaseExpiresAt: expiresAt,
      lastSyncAttemptAt: now,
    },
  });

  return updated.count === 1 ? token : null;
}

async function releaseMailboxSyncLease(mailboxId: string, token: string): Promise<void> {
  await prisma.communicationCenterMailbox.updateMany({
    where: { id: mailboxId, syncLeaseToken: token },
    data: { syncLeaseToken: null, syncLeaseExpiresAt: null },
  });
}

export async function syncCommunicationCenterMailbox(
  mailbox: CommunicationCenterMailbox,
): Promise<CommunicationCenterSyncSummary> {
  const summary: CommunicationCenterSyncSummary = {
    mailboxId: mailbox.id,
    fetched: 0,
    ingested: 0,
    duplicate: 0,
    failed: 0,
    skipped: false,
  };

  if (mailbox.status !== CommunicationCenterMailboxStatus.ACTIVE) {
    summary.skipped = true;
    summary.skipReason = "MAILBOX_NOT_ACTIVE";
    return summary;
  }

  const lease = await claimMailboxSyncLease(mailbox);
  if (!lease) {
    summary.skipped = true;
    summary.skipReason = "SYNC_LEASE_HELD";
    return summary;
  }

  try {
    const folder = await prisma.communicationCenterMailboxFolder.findFirst({
      where: {
        tenantId: mailbox.tenantId,
        mailboxId: mailbox.id,
        providerPath: COMMUNICATION_CENTER_INBOX_FOLDER_INBOX,
      },
    });
    if (!folder) {
      summary.skipped = true;
      summary.skipReason = "FOLDER_MISSING";
      return summary;
    }

    const config = resolveMailboxImapConfig(mailbox);
    const connector = createInboundCommunicationConnector();
    const batch = await connector.fetchNewInboxMessages({
      config,
      uidValidity: folder.uidValidity,
      lastProcessedUid: folder.lastProcessedUid,
      batchSize: COMMUNICATION_CENTER_SYNC_BATCH_SIZE,
    });

    if (
      folder.uidValidity !== null &&
      folder.uidValidity !== undefined &&
      BigInt(batch.uidValidity) !== folder.uidValidity
    ) {
      await prisma.communicationCenterMailboxFolder.update({
        where: { id: folder.id },
        data: {
          uidValidity: BigInt(batch.uidValidity),
          lastProcessedUid: null,
          lastSyncAt: new Date(),
          lastSyncStatus: "UIDVALIDITY_RESET",
          lastError: null,
        },
      });
      return summary;
    }

    summary.fetched = batch.messages.length;
    let cursorAdvanceUid = folder.lastProcessedUid ? Number(folder.lastProcessedUid) : 0;

    for (const message of batch.messages) {
      const result = await ingestCommunicationCenterImapMessage({
        tenantId: mailbox.tenantId,
        mailboxId: mailbox.id,
        folderId: folder.id,
        fetched: message,
      });

      if (result.kind === "INGESTED") summary.ingested += 1;
      if (result.kind === "DUPLICATE") summary.duplicate += 1;
      if (result.kind === "FAILED") {
        summary.failed += 1;
        if (result.retryable) break;
      }

      if (result.kind !== "FAILED" || !result.retryable) {
        cursorAdvanceUid = Math.max(cursorAdvanceUid, message.uid);
      } else {
        break;
      }
    }

    if (cursorAdvanceUid > (folder.lastProcessedUid ? Number(folder.lastProcessedUid) : 0)) {
      await prisma.communicationCenterMailboxFolder.update({
        where: { id: folder.id },
        data: {
          uidValidity: BigInt(batch.uidValidity),
          lastProcessedUid: BigInt(cursorAdvanceUid),
          lastSyncAt: new Date(),
          lastSyncStatus: "OK",
          lastError: null,
        },
      });
    }

    await prisma.communicationCenterMailbox.update({
      where: { id: mailbox.id },
      data: {
        lastSyncSuccessAt: new Date(),
        lastSyncErrorCode: null,
        lastSyncErrorMessage: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 200) : "SYNC_FAILED";
    await prisma.communicationCenterMailbox.update({
      where: { id: mailbox.id },
      data: {
        lastSyncErrorCode: "SYNC_FAILED",
        lastSyncErrorMessage: message,
      },
    });
  } finally {
    await releaseMailboxSyncLease(mailbox.id, lease);
  }

  return summary;
}

export async function runCommunicationCenterInboundSync(): Promise<{
  mailboxes: number;
  summaries: CommunicationCenterSyncSummary[];
}> {
  const mailboxes = await prisma.communicationCenterMailbox.findMany({
    where: { status: CommunicationCenterMailboxStatus.ACTIVE },
    orderBy: { lastSyncAttemptAt: "asc" },
    take: 20,
  });

  const summaries: CommunicationCenterSyncSummary[] = [];
  for (const mailbox of mailboxes) {
    summaries.push(await syncCommunicationCenterMailbox(mailbox));
  }

  return { mailboxes: mailboxes.length, summaries };
}
