import { PlatformCommunicationEmailDeliveryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveDeliveryEmailSender } from "@/lib/communication/sender-identity/delivery-email-sender-service";
import { sendOutboundEmail, OutboundEmailTransportError } from "@/lib/email/outbound-email-transport";
import {
  PLATFORM_EMAIL_DELIVERY_BATCH_SIZE,
  PLATFORM_EMAIL_LOG_PREFIX,
  PLATFORM_EMAIL_MAX_ATTEMPTS,
  PLATFORM_EMAIL_PROCESSING_LEASE_MS,
  PLATFORM_EMAIL_PROVIDER_RESEND,
} from "@/lib/communication/platform-email/constants";
import { renderPlatformCommunicationEmail } from "@/lib/communication/platform-email/email-rendering-service";
import { resolveRecipientSnapshotEmailEligibility } from "@/lib/communication/platform-email/recipient-email-eligibility";
import { resolveCommunicationChannelIntent } from "@/lib/communication/platform-email/communication-channel-intent";
import { resolvePublicationCommunicationPreferenceCategory } from "@/lib/communication/preferences/publication-category";
import { loadPlatformCommunicationAttachmentsForDelivery } from "@/lib/communication/attachment-service";

export type ProcessPlatformEmailDeliveriesResult = {
  examined: number;
  sent: number;
  failed: number;
  skipped: number;
  claimed: number;
};

type AttemptRow = Prisma.PlatformCommunicationEmailDeliveryAttemptGetPayload<{
  include: {
    recipientSnapshot: {
      select: {
        id: true;
        tenantId: true;
        communicationId: true;
        recipientKind: true;
        subjectPersonId: true;
        sponsorContactId: true;
        deliveryUserId: true;
        externalSnapshotJson: true;
        renderedSubject: true;
        renderedBodyText: true;
      };
    };
    communication: {
      select: {
        subject: true;
        bodyText: true;
        kind: true;
        orchestrationMetaJson: true;
        audienceSpecJson: true;
        emailSenderIdentityId: true;
        emailSenderDisplayNameSnapshot: true;
        emailSenderAddressSnapshot: true;
        emailSenderSource: true;
      };
    };
  };
}>;

export async function processPendingPlatformCommunicationEmailDeliveries(
  batchSize = PLATFORM_EMAIL_DELIVERY_BATCH_SIZE,
): Promise<ProcessPlatformEmailDeliveriesResult> {
  await recoverStalePlatformEmailProcessingAttempts();

  const summary: ProcessPlatformEmailDeliveriesResult = {
    examined: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    claimed: 0,
  };

  const candidates = await prisma.platformCommunicationEmailDeliveryAttempt.findMany({
    where: {
      status: {
        in: [
          PlatformCommunicationEmailDeliveryStatus.PENDING,
          PlatformCommunicationEmailDeliveryStatus.FAILED,
        ],
      },
      attemptCount: { lt: PLATFORM_EMAIL_MAX_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
    include: {
      recipientSnapshot: true,
      communication: {
        select: {
          subject: true,
          bodyText: true,
          kind: true,
          orchestrationMetaJson: true,
          audienceSpecJson: true,
          emailSenderIdentityId: true,
          emailSenderDisplayNameSnapshot: true,
          emailSenderAddressSnapshot: true,
          emailSenderSource: true,
        },
      },
    },
  });

  summary.examined = candidates.length;

  for (const attempt of candidates) {
    const claimed = await claimPlatformEmailAttempt(attempt);
    if (!claimed) continue;
    summary.claimed += 1;

    const channelIntent = resolveCommunicationChannelIntent({
      orchestrationMetaJson: attempt.communication.orchestrationMetaJson,
    });

    const preferenceCategory = resolvePublicationCommunicationPreferenceCategory({
      kind: attempt.communication.kind,
      audienceSpecJson: attempt.communication.audienceSpecJson,
    });

    const eligibility = await resolveRecipientSnapshotEmailEligibility({
      tenantId: attempt.tenantId,
      snapshot: attempt.recipientSnapshot,
      emailChannelEnabled: channelIntent.email,
      category: preferenceCategory,
    });

    if (!eligibility.eligible || !eligibility.email) {
      await prisma.platformCommunicationEmailDeliveryAttempt.update({
        where: { id: attempt.id },
        data: {
          status: PlatformCommunicationEmailDeliveryStatus.SKIPPED,
          failureCode: eligibility.skipReason ?? "NOT_DELIVERABLE",
        },
      });
      summary.skipped += 1;
      continue;
    }

    const tenant = await prisma.tenant.findFirst({
      where: { id: attempt.tenantId },
      select: { name: true },
    });
    if (!tenant) {
      await prisma.platformCommunicationEmailDeliveryAttempt.update({
        where: { id: attempt.id },
        data: {
          status: PlatformCommunicationEmailDeliveryStatus.FAILED,
          failureCode: "TENANT_NOT_FOUND",
        },
      });
      summary.failed += 1;
      continue;
    }

    const deepLinkPath =
      attempt.communication.kind === "CAMPAIGN"
        ? `/dashboard/communication/kampagnen/${attempt.communicationId}`
        : `/dashboard/communication/mitteilungen/${attempt.communicationId}`;

    const effectiveSubject =
      attempt.recipientSnapshot.renderedSubject ?? attempt.communication.subject;
    const effectiveBodyText =
      attempt.recipientSnapshot.renderedBodyText ?? attempt.communication.bodyText;

    const rendered = renderPlatformCommunicationEmail({
      tenantName: tenant.name,
      subject: effectiveSubject,
      bodyText: effectiveBodyText,
      includeDeepLink: attempt.recipientSnapshot.recipientKind !== "EXTERNAL_SPONSOR_CONTACT",
      deepLinkPath,
    });

    const deliverySender = await resolveDeliveryEmailSender({
      tenantId: attempt.tenantId,
      emailSenderIdentityId: attempt.communication.emailSenderIdentityId,
      emailSenderDisplayNameSnapshot: attempt.communication.emailSenderDisplayNameSnapshot,
      emailSenderAddressSnapshot: attempt.communication.emailSenderAddressSnapshot,
      emailSenderSource: attempt.communication.emailSenderSource,
    });
    if (!deliverySender.ok) {
      await prisma.platformCommunicationEmailDeliveryAttempt.update({
        where: { id: attempt.id },
        data: {
          status: PlatformCommunicationEmailDeliveryStatus.FAILED,
          failureCode: deliverySender.failureCode,
        },
      });
      summary.failed += 1;
      continue;
    }

    try {
      const sender = deliverySender.sender;
      let mailAttachments;
      try {
        const loaded = await loadPlatformCommunicationAttachmentsForDelivery({
          tenantId: attempt.tenantId,
          communicationId: attempt.communicationId,
        });
        mailAttachments =
          loaded.length > 0
            ? loaded.map((item) => ({
                filename: item.filename,
                content: item.content,
                contentType: item.contentType,
              }))
            : undefined;
      } catch (loadError) {
        await prisma.platformCommunicationEmailDeliveryAttempt.update({
          where: { id: attempt.id },
          data: {
            status: PlatformCommunicationEmailDeliveryStatus.FAILED,
            failureCode: "ATTACHMENT_UNAVAILABLE",
          },
        });
        summary.failed += 1;
        console.warn(`${PLATFORM_EMAIL_LOG_PREFIX} attachment load failed`, {
          attemptId: attempt.id,
          message: loadError instanceof Error ? loadError.message : "unknown",
        });
        continue;
      }

      const transport = await sendOutboundEmail({
        from: sender.formattedFrom,
        to: eligibility.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: attempt.idempotencyKey,
        attachments: mailAttachments,
      });

      await prisma.platformCommunicationEmailDeliveryAttempt.update({
        where: { id: attempt.id },
        data: {
          status: PlatformCommunicationEmailDeliveryStatus.SENT,
          sentAt: new Date(),
          provider: PLATFORM_EMAIL_PROVIDER_RESEND,
          providerMessageId: transport.messageId,
          failureCode: null,
        },
      });
      summary.sent += 1;
    } catch (error) {
      const failureCode =
        error instanceof OutboundEmailTransportError ? error.code : "PROVIDER_FAILURE";
      const permanent =
        error instanceof OutboundEmailTransportError ? error.permanent : false;
      const attempts = attempt.attemptCount + 1;
      const terminal = permanent || attempts >= PLATFORM_EMAIL_MAX_ATTEMPTS;

      await prisma.platformCommunicationEmailDeliveryAttempt.update({
        where: { id: attempt.id },
        data: {
          status: terminal
            ? PlatformCommunicationEmailDeliveryStatus.FAILED
            : PlatformCommunicationEmailDeliveryStatus.FAILED,
          failureCode: failureCode.slice(0, 120),
        },
      });
      summary.failed += 1;
      console.warn(`${PLATFORM_EMAIL_LOG_PREFIX} attempt failed`, {
        attemptId: attempt.id,
        failureCode,
        permanent,
      });
    }
  }

  return summary;
}

async function claimPlatformEmailAttempt(attempt: AttemptRow): Promise<boolean> {
  const result = await prisma.platformCommunicationEmailDeliveryAttempt.updateMany({
    where: {
      id: attempt.id,
      status: attempt.status,
      attemptCount: attempt.attemptCount,
    },
    data: {
      status: PlatformCommunicationEmailDeliveryStatus.PROCESSING,
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });
  return result.count === 1;
}

export async function recoverStalePlatformEmailProcessingAttempts(
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - PLATFORM_EMAIL_PROCESSING_LEASE_MS);
  const result = await prisma.platformCommunicationEmailDeliveryAttempt.updateMany({
    where: {
      status: PlatformCommunicationEmailDeliveryStatus.PROCESSING,
      lastAttemptAt: { lt: cutoff },
      attemptCount: { lt: PLATFORM_EMAIL_MAX_ATTEMPTS },
    },
    data: {
      status: PlatformCommunicationEmailDeliveryStatus.FAILED,
      failureCode: "PROCESSING_LEASE_EXPIRED",
    },
  });
  return result.count;
}
