/**
 * SCE-COMM-14 — enqueue outbound email delivery attempts after publish (non-blocking).
 */

import { PlatformCommunicationEmailDeliveryStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordPlatformCommunicationAudit } from "@/lib/communication/team/platform-communication-audit";
import type { CommunicationChannelIntent } from "@/lib/communication/platform-email/communication-channel-intent";
import { evaluatePlatformEmailReadiness } from "@/lib/communication/platform-email/email-readiness-service";
import { resolveRecipientSnapshotEmailEligibility } from "@/lib/communication/platform-email/recipient-email-eligibility";
import { PLATFORM_EMAIL_PROVIDER_RESEND } from "@/lib/communication/platform-email/constants";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";

export type EnqueuePlatformEmailDeliveriesResult = {
  examined: number;
  queued: number;
  skipped: number;
};

function buildIdempotencyKey(communicationId: string, snapshotId: string): string {
  return `platform-email:${communicationId}:${snapshotId}`;
}

export async function enqueuePlatformCommunicationEmailDeliveries(input: {
  tenantId: string;
  communicationId: string;
  channelIntent: CommunicationChannelIntent;
  category?: CommunicationPreferenceCategory;
  actorUserId?: string | null;
  communicationKind?: string;
}): Promise<EnqueuePlatformEmailDeliveriesResult> {
  const summary: EnqueuePlatformEmailDeliveriesResult = {
    examined: 0,
    queued: 0,
    skipped: 0,
  };

  if (!input.channelIntent.email) {
    return summary;
  }

  const readiness = await evaluatePlatformEmailReadiness(input.tenantId);
  const snapshots = await prisma.platformCommunicationRecipientSnapshot.findMany({
    where: {
      tenantId: input.tenantId,
      communicationId: input.communicationId,
    },
    select: {
      id: true,
      tenantId: true,
      recipientKind: true,
      subjectPersonId: true,
      deliveryUserId: true,
      externalSnapshotJson: true,
    },
  });

  summary.examined = snapshots.length;
  const rows: Prisma.PlatformCommunicationEmailDeliveryAttemptCreateManyInput[] = [];

  for (const snapshot of snapshots) {
    const eligibility = await resolveRecipientSnapshotEmailEligibility({
      tenantId: input.tenantId,
      snapshot,
      emailChannelEnabled: input.channelIntent.email,
      category: input.category,
    });

    if (!eligibility.eligible || !eligibility.email) {
      rows.push({
        tenantId: input.tenantId,
        communicationId: input.communicationId,
        platformCommunicationRecipientSnapshotId: snapshot.id,
        status: PlatformCommunicationEmailDeliveryStatus.SKIPPED,
        failureCode: eligibility.skipReason ?? "NOT_DELIVERABLE",
        provider: PLATFORM_EMAIL_PROVIDER_RESEND,
        idempotencyKey: buildIdempotencyKey(input.communicationId, snapshot.id),
      });
      summary.skipped += 1;
      continue;
    }

    if (!readiness.ready) {
      rows.push({
        tenantId: input.tenantId,
        communicationId: input.communicationId,
        platformCommunicationRecipientSnapshotId: snapshot.id,
        status: PlatformCommunicationEmailDeliveryStatus.SKIPPED,
        failureCode: readiness.reasons[0] ?? "EMAIL_NOT_READY",
        provider: PLATFORM_EMAIL_PROVIDER_RESEND,
        idempotencyKey: buildIdempotencyKey(input.communicationId, snapshot.id),
      });
      summary.skipped += 1;
      continue;
    }

    rows.push({
      tenantId: input.tenantId,
      communicationId: input.communicationId,
      platformCommunicationRecipientSnapshotId: snapshot.id,
      status: PlatformCommunicationEmailDeliveryStatus.PENDING,
      provider: PLATFORM_EMAIL_PROVIDER_RESEND,
      idempotencyKey: buildIdempotencyKey(input.communicationId, snapshot.id),
    });
    summary.queued += 1;
  }

  if (rows.length > 0) {
    await prisma.platformCommunicationEmailDeliveryAttempt.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  if (input.actorUserId) {
    await recordPlatformCommunicationAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: "COMMUNICATION_EMAIL_ENQUEUED",
      communicationId: input.communicationId,
      kind: input.communicationKind,
      status: "PUBLISHED",
      metadata: {
        queued: summary.queued,
        skipped: summary.skipped,
      },
    });
  }

  return summary;
}
