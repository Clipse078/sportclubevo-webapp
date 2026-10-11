/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D R1 — proactive target-trainer awareness via SCE notifications.
 *
 * Post-commit side effect: release creation must succeed even if notification delivery fails.
 */

import {
  NotificationEntityType,
  NotificationType,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { NOTIFICATION_LOG_PREFIX } from "@/lib/notifications/constants";
import { resolveEffectivePreference } from "@/lib/notifications/defaults";
import { buildPlayerReleaseTargetedAwarenessDedupKey } from "@/lib/notifications/deduplication";
import type { NotificationChannelDefaults } from "@/lib/notifications/defaults";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import { loadEffectivePreferencesForUsers } from "@/lib/notifications/preference-service";
import {
  buildTargetedPlayerReleaseAwarenessCopy,
  inboundPlayerReleaseActivityHref,
  inboundPlayerReleaseTeamKaderHref,
} from "@/lib/match-squad/player-release-target-awareness-copy";
import { countActionableInboundTargetedReleases } from "@/lib/match-squad/player-release-target-awareness-service";
import { resolveTargetTeamTrainerRecipientUserIds } from "@/lib/match-squad/player-release-target-trainer-recipients";

/** Releases created within this window share one aggregated in-app notification per trainer. */
export const PLAYER_RELEASE_AWARENESS_AGGREGATION_WINDOW_MS = 60_000;

export type EmitTargetedPlayerReleaseAwarenessInput = {
  tenantId: string;
  sourceTeamSeasonId: string;
  targetTeamSeasonId: string;
  targetEventId?: string | null;
  actorUserId: string;
  awarenessBurstKey?: string | null;
  emittedAtMs?: number;
};

async function loadTeamSeasonAwarenessLabels(input: {
  tenantId: string;
  sourceTeamSeasonId: string;
  targetTeamSeasonId: string;
}): Promise<{ sourceTeamLabel: string; targetTeamLabel: string; targetTeamId: string } | null> {
  const rows = await prisma.teamSeason.findMany({
    where: {
      id: { in: [input.sourceTeamSeasonId, input.targetTeamSeasonId] },
      team: { tenantId: input.tenantId },
    },
    select: {
      id: true,
      displayName: true,
      shortName: true,
      teamId: true,
      team: { select: { name: true, shortName: true } },
    },
  });
  const source = rows.find((row) => row.id === input.sourceTeamSeasonId);
  const target = rows.find((row) => row.id === input.targetTeamSeasonId);
  if (!source || !target) return null;

  const label = (row: typeof source) =>
    row.displayName || row.shortName || row.team.shortName || row.team.name;

  return {
    sourceTeamLabel: label(source),
    targetTeamLabel: label(target),
    targetTeamId: target.teamId,
  };
}

async function upsertAwarenessForRecipient(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    recipientUserId: string;
    deduplicationKey: string;
    title: string;
    body: string;
    href: string;
    entityId: string;
    preferences: NotificationChannelDefaults;
  },
): Promise<void> {
  const existing = await tx.notification.findUnique({
    where: {
      tenantId_deduplicationKey: {
        tenantId: input.tenantId,
        deduplicationKey: input.deduplicationKey,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await tx.notification.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        body: input.body,
        href: input.href,
        readAt: null,
      },
    });
    return;
  }

  await createNotificationIdempotent(tx, {
    tenantId: input.tenantId,
    recipientUserId: input.recipientUserId,
    type: NotificationType.PLAYER_RELEASE_TARGETED,
    title: input.title,
    body: input.body,
    href: input.href,
    entityType: NotificationEntityType.PLAYER_RELEASE,
    entityId: input.entityId,
    deduplicationKey: input.deduplicationKey,
    preferences: input.preferences,
  });
}

export async function emitTargetedPlayerReleaseAwareness(
  input: EmitTargetedPlayerReleaseAwarenessInput,
): Promise<void> {
  try {
    await emitTargetedPlayerReleaseAwarenessInner(input);
  } catch (error) {
    console.error(`${NOTIFICATION_LOG_PREFIX} player release targeted awareness failed`, {
      tenantId: input.tenantId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
      targetTeamSeasonId: input.targetTeamSeasonId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function emitTargetedPlayerReleaseAwarenessInner(
  input: EmitTargetedPlayerReleaseAwarenessInput,
): Promise<void> {
  const labels = await loadTeamSeasonAwarenessLabels(input);
  if (!labels) return;

  const tenant = await prisma.tenant.findFirst({
    where: { id: input.tenantId },
    select: { timezone: true },
  });
  const timezone = tenant?.timezone ?? "Europe/Zurich";

  const targetEventId = input.targetEventId?.trim() || null;

  const playerCount = await countActionableInboundTargetedReleases({
    tenantId: input.tenantId,
    targetTeamSeasonId: input.targetTeamSeasonId,
    sourceTeamSeasonId: input.sourceTeamSeasonId,
    targetEventId,
    timezone,
  });

  if (playerCount === 0) return;

  let activityKind: "MATCH" | "TOURNAMENT" | null = null;
  let activityTitle: string | null = null;
  let activityScheduleLine: string | null = null;

  if (targetEventId) {
    const event = await prisma.event.findFirst({
      where: { id: targetEventId, tenantId: input.tenantId },
      select: { type: true, title: true, startAt: true },
    });
    if (event?.type === "MATCH" || event?.type === "TOURNAMENT") {
      activityKind = event.type;
      activityTitle = event.title;
      const dateFmt = new Intl.DateTimeFormat("de-CH", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        timeZone: timezone,
      });
      const timeFmt = new Intl.DateTimeFormat("de-CH", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      });
      activityScheduleLine = `${dateFmt.format(event.startAt)} · ${timeFmt.format(event.startAt)}`;
    }
  }

  const { title, body } = buildTargetedPlayerReleaseAwarenessCopy({
    sourceTeamLabel: labels.sourceTeamLabel,
    targetTeamLabel: labels.targetTeamLabel,
    playerCount,
    activityKind,
    activityTitle,
    activityScheduleLine,
  });

  const href = targetEventId && activityKind
    ? inboundPlayerReleaseActivityHref({ eventType: activityKind, eventId: targetEventId })
    : inboundPlayerReleaseTeamKaderHref(labels.targetTeamId);

  const recipients = await resolveTargetTeamTrainerRecipientUserIds({
    tenantId: input.tenantId,
    targetTeamSeasonId: input.targetTeamSeasonId,
    excludeUserIds: [input.actorUserId],
  });

  if (recipients.recipientUserIds.length === 0) {
    return;
  }

  const emittedAtMs = input.emittedAtMs ?? Date.now();
  const aggregationBucket = input.awarenessBurstKey?.trim()
    ? input.awarenessBurstKey.trim()
    : String(Math.floor(emittedAtMs / PLAYER_RELEASE_AWARENESS_AGGREGATION_WINDOW_MS));

  const preferences = await loadEffectivePreferencesForUsers(
    prisma,
    input.tenantId,
    recipients.recipientUserIds,
    NotificationType.PLAYER_RELEASE_TARGETED,
  );

  await prisma.$transaction(async (tx) => {
    for (const recipientUserId of recipients.recipientUserIds) {
      const deduplicationKey = buildPlayerReleaseTargetedAwarenessDedupKey({
        sourceTeamSeasonId: input.sourceTeamSeasonId,
        targetTeamSeasonId: input.targetTeamSeasonId,
        targetEventId,
        recipientUserId,
        aggregationBucket,
      });

      const pref =
        preferences.get(recipientUserId) ??
        resolveEffectivePreference(NotificationType.PLAYER_RELEASE_TARGETED, null);

      await upsertAwarenessForRecipient(tx, {
        tenantId: input.tenantId,
        recipientUserId,
        deduplicationKey,
        title,
        body,
        href,
        entityId: input.targetTeamSeasonId,
        preferences: pref,
      });
    }
  });
}

export async function acknowledgeInboundPlayerReleaseAwarenessNotifications(input: {
  tenantId: string;
  userId: string;
  targetTeamId: string;
}): Promise<number> {
  const hrefPrefix = `/dashboard/teams/${input.targetTeamId}/kader`;
  const result = await prisma.notification.updateMany({
    where: {
      tenantId: input.tenantId,
      recipientUserId: input.userId,
      type: NotificationType.PLAYER_RELEASE_TARGETED,
      readAt: null,
      href: { startsWith: hrefPrefix },
    },
    data: { readAt: new Date() },
  });
  return result.count;
}
