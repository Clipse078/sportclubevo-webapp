/**
 * SCE-COMM-19 — canonical delivery & engagement analytics (single aggregation layer).
 */

import {
  NotificationChannel,
  NotificationEntityType,
  PlatformCommunicationEmailDeliveryStatus,
  type PlatformCommunicationRecipientEngagement,
  type PlatformCommunicationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { summarizePlatformEmailDeliveries } from "@/lib/communication/platform-email/platform-email-delivery-summary-service";
import {
  ANALYTICS_TRUTH_STATEMENT,
  bucketEmailSkipFailureCode,
  mergePushRecipientStatus,
  type ChannelOutcomeCounts,
  type EmailSkipReasonBuckets,
  type InAppEngagementCounts,
  type PushAnalyticsCounts,
} from "@/lib/communication/analytics/analytics-semantics";
import {
  decodeDeliveryDetailCursor,
  encodeDeliveryDetailCursor,
} from "@/lib/communication/analytics/delivery-detail-cursor";
import { TeamCommunicationNotFoundError } from "@/lib/communication/team/team-communication-errors";

export type CommunicationPublicationAnalyticsState = {
  communicationStatus: PlatformCommunicationStatus;
  publishedAt: string | null;
  scheduleStatus: string | null;
  scheduledAt: string | null;
  /** Scheduled publication is not delivery until published. */
  deliveryAnalyticsApplicable: boolean;
};

export type CommunicationSafeguardingAnalytics = {
  youthSubjectSnapshots: number;
  guardianExpandedDeliveries: number;
  guardianUnavailableExclusions: number;
};

export type CommunicationTypeEngagement = {
  pollResponseCount: number | null;
  pollOutstandingCount: number | null;
  requestClaimCount: number | null;
  requestOutstandingCount: number | null;
};

export type CommunicationDeliveryAnalytics = {
  communicationId: string;
  truthStatement: typeof ANALYTICS_TRUTH_STATEMENT;
  publication: CommunicationPublicationAnalyticsState;
  audience: {
    targetSubjectCount: number;
    recipientSnapshotCount: number;
    deliveryIdentityCount: number;
  };
  safeguarding: CommunicationSafeguardingAnalytics;
  channels: {
    inApp: InAppEngagementCounts & { applicable: boolean };
    push: PushAnalyticsCounts & { applicable: boolean };
    email: ChannelOutcomeCounts & {
      applicable: boolean;
      skipReasons: EmailSkipReasonBuckets;
      /** Explicit: no open/read tracking. */
      openOrReadTracking: false;
    };
  };
  engagement: {
    acknowledgementRequired: boolean;
    inApp: Pick<InAppEngagementCounts, "read" | "acknowledged" | "responded" | "unread">;
    typeSpecific: CommunicationTypeEngagement;
  };
  issues: {
    emailFailed: number;
    emailSkipped: number;
    pushFailed: number;
    pushSkipped: number;
    skipReasons: EmailSkipReasonBuckets;
  };
};

export type CommunicationDeliveryDetailRow = {
  snapshotId: string;
  subjectLabel: string;
  deliveryIdentityLabel: string;
  viaGuardianSubstitution: boolean;
  safeguardingReasonCode: string | null;
  recipientKind: string;
  inAppEngagement: PlatformCommunicationRecipientEngagement | null;
  pushStatus: string | null;
  emailStatus: string | null;
  emailSkipOrFailureReason: string | null;
  pollResponded: boolean;
  requestClaimed: boolean;
};

export type CommunicationDeliveryDetailPage = {
  items: CommunicationDeliveryDetailRow[];
  nextCursor: string | null;
  hasMore: boolean;
};

async function loadCommunicationRow(tenantId: string, communicationId: string) {
  return prisma.platformCommunication.findFirst({
    where: { id: communicationId, tenantId },
    select: {
      id: true,
      status: true,
      publishedAt: true,
      acknowledgementRequired: true,
      publicationSchedule: { select: { status: true, scheduledAt: true } },
      poll: { select: { id: true } },
      request: { select: { id: true } },
    },
  });
}

async function aggregateAudienceCounts(tenantId: string, communicationId: string) {
  const where = { tenantId, communicationId };
  const [
    recipientSnapshotCount,
    subjectGroups,
    sponsorGroups,
    deliveryUserGroups,
    sponsorIdentityGroups,
  ] = await Promise.all([
    prisma.platformCommunicationRecipientSnapshot.count({ where }),
    prisma.platformCommunicationRecipientSnapshot.groupBy({
      by: ["subjectPersonId"],
      where: { ...where, subjectPersonId: { not: null } },
      _count: { _all: true },
    }),
    prisma.platformCommunicationRecipientSnapshot.groupBy({
      by: ["sponsorContactId"],
      where: { ...where, sponsorContactId: { not: null }, subjectPersonId: null },
      _count: { _all: true },
    }),
    prisma.platformCommunicationRecipientSnapshot.groupBy({
      by: ["deliveryUserId"],
      where: { ...where, deliveryUserId: { not: null } },
      _count: { _all: true },
    }),
    prisma.platformCommunicationRecipientSnapshot.groupBy({
      by: ["sponsorContactId"],
      where: { ...where, sponsorContactId: { not: null }, deliveryUserId: null },
      _count: { _all: true },
    }),
  ]);

  const targetSubjectCount = subjectGroups.length + sponsorGroups.length;
  const deliveryIdentityCount = deliveryUserGroups.length + sponsorIdentityGroups.length;

  return {
    targetSubjectCount,
    recipientSnapshotCount,
    deliveryIdentityCount,
  };
}

async function aggregateSafeguarding(tenantId: string, communicationId: string) {
  const where = { tenantId, communicationId };
  const [minorCount, guardianExpanded, unavailable] = await Promise.all([
    prisma.platformCommunicationRecipientSnapshot.count({
      where: { ...where, subjectMinorAtDispatch: true },
    }),
    prisma.platformCommunicationRecipientSnapshot.count({
      where: { ...where, viaGuardianSubstitution: true },
    }),
    prisma.platformCommunicationRecipientSnapshot.count({
      where: {
        ...where,
        safeguardingReasonCode: { in: ["GUARDIAN_UNAVAILABLE", "NO_GUARDIAN_AVAILABLE"] },
      },
    }),
  ]);
  return {
    youthSubjectSnapshots: minorCount,
    guardianExpandedDeliveries: guardianExpanded,
    guardianUnavailableExclusions: unavailable,
  };
}

async function aggregateInAppEngagement(
  tenantId: string,
  communicationId: string,
): Promise<InAppEngagementCounts & { applicable: boolean }> {
  const grouped = await prisma.platformCommunicationRecipientSnapshot.groupBy({
    by: ["engagement"],
    where: {
      tenantId,
      communicationId,
      channel: "IN_APP",
      recipientKind: "INTERNAL_IN_APP",
    },
    _count: { _all: true },
  });

  const counts: InAppEngagementCounts = {
    available: 0,
    unread: 0,
    read: 0,
    acknowledged: 0,
    responded: 0,
  };

  for (const row of grouped) {
    const n = row._count._all;
    counts.available += n;
    switch (row.engagement) {
      case "PENDING":
      case "DELIVERED":
        counts.unread += n;
        break;
      case "READ":
        counts.read += n;
        break;
      case "ACKNOWLEDGED":
        counts.acknowledged += n;
        counts.read += n;
        break;
      case "RESPONDED":
        counts.responded += n;
        counts.read += n;
        break;
      default:
        break;
    }
  }

  return { ...counts, applicable: counts.available > 0 };
}

async function aggregateEmail(
  tenantId: string,
  communicationId: string,
): Promise<
  ChannelOutcomeCounts & {
    applicable: boolean;
    skipReasons: EmailSkipReasonBuckets;
    openOrReadTracking: false;
  }
> {
  const [summary, skipGrouped] = await Promise.all([
    summarizePlatformEmailDeliveries({ tenantId, communicationId }),
    prisma.platformCommunicationEmailDeliveryAttempt.groupBy({
      by: ["failureCode"],
      where: {
        tenantId,
        communicationId,
        status: PlatformCommunicationEmailDeliveryStatus.SKIPPED,
      },
      _count: { _all: true },
    }),
  ]);

  const skipReasons: EmailSkipReasonBuckets = {
    preferenceDisabled: 0,
    consentRequired: 0,
    channelUnavailable: 0,
    missingOrInvalidEmail: 0,
    other: 0,
  };

  for (const row of skipGrouped) {
    const bucket = bucketEmailSkipFailureCode(row.failureCode);
    skipReasons[bucket] += row._count._all;
  }

  const total =
    summary.pending +
    summary.processing +
    summary.sent +
    summary.failed +
    summary.skipped;

  return {
    pending: summary.pending,
    processing: summary.processing,
    sent: summary.sent,
    failed: summary.failed,
    skipped: summary.skipped,
    applicable: total > 0,
    skipReasons,
    openOrReadTracking: false,
  };
}

async function aggregatePush(tenantId: string, communicationId: string): Promise<
  PushAnalyticsCounts & { applicable: boolean }
> {
  const [deliveries, deviceGrouped] = await Promise.all([
    prisma.notificationDelivery.findMany({
      where: {
        tenantId,
        channel: NotificationChannel.PUSH,
        notification: {
          entityType: NotificationEntityType.COMMUNICATION,
          entityId: communicationId,
        },
      },
      select: { status: true },
    }),
    prisma.notificationPushDeliveryAttempt.groupBy({
      by: ["status"],
      where: {
        tenantId,
        recipientSnapshot: { communicationId },
      },
      _count: { _all: true },
    }),
  ]);

  const outcomes: ChannelOutcomeCounts = {
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  for (const d of deliveries) {
    switch (d.status) {
      case "PENDING":
        outcomes.pending += 1;
        break;
      case "PROCESSING":
        outcomes.processing += 1;
        break;
      case "SENT":
        outcomes.sent += 1;
        break;
      case "FAILED":
        outcomes.failed += 1;
        break;
      case "SKIPPED":
        outcomes.skipped += 1;
        break;
      default:
        break;
    }
  }

  let deviceAttempts = 0;
  for (const row of deviceGrouped) {
    deviceAttempts += row._count._all;
  }

  return {
    recipientIdentities: deliveries.length,
    deviceAttempts,
    outcomes,
    applicable: deliveries.length > 0 || deviceAttempts > 0,
  };
}

async function aggregateTypeSpecific(
  tenantId: string,
  communicationId: string,
  pollId: string | undefined,
  requestId: string | undefined,
): Promise<CommunicationTypeEngagement> {
  const base = {
    pollResponseCount: null as number | null,
    pollOutstandingCount: null as number | null,
    requestClaimCount: null as number | null,
    requestOutstandingCount: null as number | null,
  };

  if (pollId) {
    const [responses, eligible] = await Promise.all([
      prisma.platformCommunicationPollResponse.count({
        where: { tenantId, pollId },
      }),
      prisma.platformCommunicationRecipientSnapshot.count({
        where: {
          tenantId,
          communicationId,
          channel: "IN_APP",
          recipientKind: "INTERNAL_IN_APP",
        },
      }),
    ]);
    base.pollResponseCount = responses;
    base.pollOutstandingCount = Math.max(eligible - responses, 0);
  }

  if (requestId) {
    const [claims, eligible] = await Promise.all([
      prisma.platformCommunicationRequestClaim.count({
        where: { tenantId, slot: { requestId } },
      }),
      prisma.platformCommunicationRecipientSnapshot.count({
        where: {
          tenantId,
          communicationId,
          channel: "IN_APP",
          recipientKind: "INTERNAL_IN_APP",
        },
      }),
    ]);
    base.requestClaimCount = claims;
    base.requestOutstandingCount = Math.max(eligible - claims, 0);
  }

  return base;
}

export async function getCommunicationDeliveryAnalytics(input: {
  tenantId: string;
  communicationId: string;
}): Promise<CommunicationDeliveryAnalytics | null> {
  const row = await loadCommunicationRow(input.tenantId, input.communicationId);
  if (!row) return null;

  const deliveryAnalyticsApplicable = row.status === "PUBLISHED";

  const publication: CommunicationPublicationAnalyticsState = {
    communicationStatus: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    scheduleStatus: row.publicationSchedule?.status ?? null,
    scheduledAt: row.publicationSchedule?.scheduledAt?.toISOString() ?? null,
    deliveryAnalyticsApplicable,
  };

  if (!deliveryAnalyticsApplicable) {
    return {
      communicationId: row.id,
      truthStatement: ANALYTICS_TRUTH_STATEMENT,
      publication,
      audience: {
        targetSubjectCount: 0,
        recipientSnapshotCount: 0,
        deliveryIdentityCount: 0,
      },
      safeguarding: {
        youthSubjectSnapshots: 0,
        guardianExpandedDeliveries: 0,
        guardianUnavailableExclusions: 0,
      },
      channels: {
        inApp: {
          available: 0,
          unread: 0,
          read: 0,
          acknowledged: 0,
          responded: 0,
          applicable: false,
        },
        push: {
          recipientIdentities: 0,
          deviceAttempts: 0,
          outcomes: {
            pending: 0,
            processing: 0,
            sent: 0,
            failed: 0,
            skipped: 0,
          },
          applicable: false,
        },
        email: {
          pending: 0,
          processing: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          applicable: false,
          skipReasons: {
            preferenceDisabled: 0,
            consentRequired: 0,
            channelUnavailable: 0,
            missingOrInvalidEmail: 0,
            other: 0,
          },
          openOrReadTracking: false,
        },
      },
      engagement: {
        acknowledgementRequired: row.acknowledgementRequired,
        inApp: { read: 0, acknowledged: 0, responded: 0, unread: 0 },
        typeSpecific: {
          pollResponseCount: null,
          pollOutstandingCount: null,
          requestClaimCount: null,
          requestOutstandingCount: null,
        },
      },
      issues: {
        emailFailed: 0,
        emailSkipped: 0,
        pushFailed: 0,
        pushSkipped: 0,
        skipReasons: {
          preferenceDisabled: 0,
          consentRequired: 0,
          channelUnavailable: 0,
          missingOrInvalidEmail: 0,
          other: 0,
        },
      },
    };
  }

  const [audience, safeguarding, inApp, email, push, typeSpecific] = await Promise.all([
    aggregateAudienceCounts(input.tenantId, row.id),
    aggregateSafeguarding(input.tenantId, row.id),
    aggregateInAppEngagement(input.tenantId, row.id),
    aggregateEmail(input.tenantId, row.id),
    aggregatePush(input.tenantId, row.id),
    aggregateTypeSpecific(
      input.tenantId,
      row.id,
      row.poll?.id,
      row.request?.id,
    ),
  ]);

  return {
    communicationId: row.id,
    truthStatement: ANALYTICS_TRUTH_STATEMENT,
    publication,
    audience,
    safeguarding,
    channels: { inApp, push, email },
    engagement: {
      acknowledgementRequired: row.acknowledgementRequired,
      inApp: {
        read: inApp.read,
        acknowledged: inApp.acknowledged,
        responded: inApp.responded,
        unread: inApp.unread,
      },
      typeSpecific,
    },
    issues: {
      emailFailed: email.failed,
      emailSkipped: email.skipped,
      pushFailed: push.outcomes.failed,
      pushSkipped: push.outcomes.skipped,
      skipReasons: email.skipReasons,
    },
  };
}

function subjectLabelFromSnapshot(row: {
  subjectPerson: { firstName: string; lastName: string } | null;
  sponsorContact: { firstName: string; lastName: string } | null;
  externalSnapshotJson: unknown;
}): string {
  if (row.subjectPerson) {
    return `${row.subjectPerson.firstName} ${row.subjectPerson.lastName}`.trim();
  }
  if (row.sponsorContact) {
    return `${row.sponsorContact.firstName} ${row.sponsorContact.lastName}`.trim();
  }
  if (row.externalSnapshotJson && typeof row.externalSnapshotJson === "object") {
    const ext = row.externalSnapshotJson as { displayName?: string };
    if (typeof ext.displayName === "string" && ext.displayName.trim()) {
      return ext.displayName.trim();
    }
  }
  return "Empfänger";
}

function deliveryIdentityLabel(row: {
  viaGuardianSubstitution: boolean;
  deliveryUserId: string | null;
  sponsorContact: { firstName: string; lastName: string } | null;
}): string {
  if (row.viaGuardianSubstitution) {
    return "Erziehungsberechtigten-Konto";
  }
  if (row.sponsorContact) {
    return "Sponsor-Kontakt (E-Mail)";
  }
  if (row.deliveryUserId) {
    return "Benutzerkonto";
  }
  return "—";
}

export async function listCommunicationDeliveryDetail(input: {
  tenantId: string;
  communicationId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<CommunicationDeliveryDetailPage> {
  const row = await loadCommunicationRow(input.tenantId, input.communicationId);
  if (!row || row.status !== "PUBLISHED") {
    throw new TeamCommunicationNotFoundError();
  }

  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const afterId = decodeDeliveryDetailCursor(input.cursor);

  const snapshots = await prisma.platformCommunicationRecipientSnapshot.findMany({
    where: {
      tenantId: input.tenantId,
      communicationId: input.communicationId,
      ...(afterId ? { id: { gt: afterId } } : {}),
    },
    orderBy: { id: "asc" },
    take: limit + 1,
    select: {
      id: true,
      recipientKind: true,
      channel: true,
      engagement: true,
      viaGuardianSubstitution: true,
      safeguardingReasonCode: true,
      deliveryUserId: true,
      subjectPerson: { select: { firstName: true, lastName: true } },
      sponsorContact: { select: { firstName: true, lastName: true } },
      externalSnapshotJson: true,
      emailDeliveryAttempts: { select: { status: true, failureCode: true } },
      pushDeliveryAttempts: { select: { status: true } },
      pollResponses: { select: { id: true }, take: 1 },
      requestClaims: { select: { id: true }, take: 1 },
    },
  });

  const hasMore = snapshots.length > limit;
  const pageRows = hasMore ? snapshots.slice(0, limit) : snapshots;

  const pushByUser = new Map<string, string>();
  if (pageRows.some((s) => s.deliveryUserId)) {
    const userIds = [
      ...new Set(pageRows.map((s) => s.deliveryUserId).filter(Boolean) as string[]),
    ];
    const pushDeliveries = await prisma.notificationDelivery.findMany({
      where: {
        tenantId: input.tenantId,
        channel: NotificationChannel.PUSH,
        notification: {
          entityType: NotificationEntityType.COMMUNICATION,
          entityId: input.communicationId,
          recipientUserId: { in: userIds },
        },
      },
      select: { status: true, notification: { select: { recipientUserId: true } } },
    });
    for (const d of pushDeliveries) {
      const uid = d.notification.recipientUserId;
      pushByUser.set(uid, mergePushRecipientStatus(pushByUser.get(uid) ?? null, d.status));
    }
  }

  const items: CommunicationDeliveryDetailRow[] = pageRows.map((snap) => {
    const emailAttempt = snap.emailDeliveryAttempts[0];
    let pushStatus: string | null = null;
    if (snap.recipientKind === "INTERNAL_IN_APP" && snap.deliveryUserId) {
      pushStatus = pushByUser.get(snap.deliveryUserId) ?? null;
      if (!pushStatus && snap.pushDeliveryAttempts.length > 0) {
        for (const att of snap.pushDeliveryAttempts) {
          pushStatus = mergePushRecipientStatus(pushStatus, att.status);
        }
      }
    }

    const inAppEngagement =
      snap.channel === "IN_APP" && snap.recipientKind === "INTERNAL_IN_APP"
        ? snap.engagement
        : snap.recipientKind === "EXTERNAL_SPONSOR_CONTACT" ||
            snap.recipientKind === "INTERNAL_PERSON_NO_CHANNEL"
          ? null
          : snap.engagement;

    return {
      snapshotId: snap.id,
      subjectLabel: subjectLabelFromSnapshot(snap),
      deliveryIdentityLabel: deliveryIdentityLabel(snap),
      viaGuardianSubstitution: snap.viaGuardianSubstitution,
      safeguardingReasonCode: snap.safeguardingReasonCode,
      recipientKind: snap.recipientKind,
      inAppEngagement,
      pushStatus,
      emailStatus: emailAttempt?.status ?? null,
      emailSkipOrFailureReason: emailAttempt?.failureCode ?? null,
      pollResponded: snap.pollResponses.length > 0,
      requestClaimed: snap.requestClaims.length > 0,
    };
  });

  const last = pageRows[pageRows.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? encodeDeliveryDetailCursor(last.id) : null,
    hasMore,
  };
}
