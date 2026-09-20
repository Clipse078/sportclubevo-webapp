import {
  NotificationEntityType,
  NotificationType as NotificationTypeEnum,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getUserIdsAuthorizedToRespondForPerson } from "@/lib/participation/authorization";
import { formatLocalDateTimeLabel } from "@/lib/reminders/deadline-reminder-schedule";
import {
  buildParticipationOverdueDedupKey,
  buildParticipationReminderDedupKey,
  participationPersonalInboxHref,
} from "./deduplication";
import { createNotificationIdempotent } from "./notification-service";
import { loadEffectivePreferencesForUsers } from "./preference-service";
import {
  buildParticipationOverdueCopy,
  buildParticipationReminderCopy,
} from "./participation-copy";

export type ProcessParticipationDeadlineNotificationsResult = {
  reminderCreated: number;
  overdueCreated: number;
  tenantsProcessed: number;
};

type ParticipationTarget = {
  kind: "TRAINING" | "MATCH" | "TOURNAMENT";
  entityId: string;
  teamSeasonId: string;
  title: string;
  participationResponseDueAt: Date;
  participationReminder1At: Date | null;
  participationReminder2At: Date | null;
  eventStartAt: Date;
};

async function loadOpenPersonIdsForTarget(
  tenantId: string,
  target: ParticipationTarget,
): Promise<string[]> {
  const squad = await prisma.playerSquadMember.findMany({
    where: {
      teamSeasonId: target.teamSeasonId,
      teamSeason: { status: "ACTIVE", team: { tenantId } },
    },
    select: { personId: true },
  });
  if (squad.length === 0) return [];

  const personIds = squad.map((s) => s.personId);
  const responses = await prisma.participationResponse.findMany({
    where: {
      tenantId,
      teamSeasonId: target.teamSeasonId,
      personId: { in: personIds },
      ...(target.kind === "TRAINING"
        ? { trainingSessionId: target.entityId, eventKind: "TRAINING" }
        : { eventId: target.entityId, eventKind: target.kind }),
    },
    select: { personId: true, status: true },
  });

  const statusByPerson = new Map(responses.map((r) => [r.personId, r.status]));
  return personIds.filter((personId) => (statusByPerson.get(personId) ?? "OPEN") === "OPEN");
}

async function emitForTarget(input: {
  tenantId: string;
  target: ParticipationTarget;
  now: Date;
  locale: string;
  timeZone: string;
}): Promise<{ reminderCreated: number; overdueCreated: number }> {
  const openPersonIds = await loadOpenPersonIdsForTarget(input.tenantId, input.target);
  if (openPersonIds.length === 0) {
    return { reminderCreated: 0, overdueCreated: 0 };
  }

  const persons = await prisma.person.findMany({
    where: { id: { in: openPersonIds }, tenantId: input.tenantId },
    select: { id: true, firstName: true, lastName: true, displayName: true },
  });

  const dueLabel = formatLocalDateTimeLabel(
    input.target.participationResponseDueAt,
    input.locale,
    input.timeZone,
  );
  const href = participationPersonalInboxHref();
  let reminderCreated = 0;
  let overdueCreated = 0;

  for (const person of persons) {
    const displayName =
      person.displayName?.trim() || `${person.firstName} ${person.lastName}`.trim();
    const recipientUserIds = await getUserIdsAuthorizedToRespondForPerson(
      input.tenantId,
      person.id,
    );
    if (recipientUserIds.length === 0) continue;

    const entityType =
      input.target.kind === "TRAINING"
        ? NotificationEntityType.TRAINING_SESSION
        : NotificationEntityType.EVENT;

    for (const stage of [1, 2] as const) {
      const reminderAt =
        stage === 1
          ? input.target.participationReminder1At
          : input.target.participationReminder2At;
      if (!reminderAt) continue;
      if (reminderAt.getTime() > input.now.getTime()) continue;
      if (input.now.getTime() >= input.target.participationResponseDueAt.getTime()) continue;

      const preferences = await loadEffectivePreferencesForUsers(
        prisma,
        input.tenantId,
        recipientUserIds,
        NotificationTypeEnum.PARTICIPATION_REMINDER,
      );
      const copy = buildParticipationReminderCopy({
        participantDisplayName: displayName,
        eventTitle: input.target.title,
        dueLabel,
        stage,
      });

      for (const recipientUserId of recipientUserIds) {
        const pref = preferences.get(recipientUserId);
        if (!pref) continue;
        const result = await createNotificationIdempotent(prisma, {
          tenantId: input.tenantId,
          recipientUserId,
          type: NotificationTypeEnum.PARTICIPATION_REMINDER,
          title: copy.title,
          body: copy.body,
          href,
          entityType,
          entityId: input.target.entityId,
          deduplicationKey: buildParticipationReminderDedupKey({
            tenantId: input.tenantId,
            personId: person.id,
            kind: input.target.kind,
            entityId: input.target.entityId,
            recipientUserId,
            stage,
            reminderAtIso: reminderAt.toISOString(),
          }),
          preferences: pref,
        });
        if (result?.kind === "CREATED") reminderCreated++;
      }
    }

    if (input.now.getTime() >= input.target.participationResponseDueAt.getTime()) {
      const preferences = await loadEffectivePreferencesForUsers(
        prisma,
        input.tenantId,
        recipientUserIds,
        NotificationTypeEnum.PARTICIPATION_OVERDUE,
      );
      const copy = buildParticipationOverdueCopy({
        participantDisplayName: displayName,
        dueLabel,
      });

      for (const recipientUserId of recipientUserIds) {
        const pref = preferences.get(recipientUserId);
        if (!pref) continue;
        const result = await createNotificationIdempotent(prisma, {
          tenantId: input.tenantId,
          recipientUserId,
          type: NotificationTypeEnum.PARTICIPATION_OVERDUE,
          title: copy.title,
          body: copy.body,
          href,
          entityType,
          entityId: input.target.entityId,
          deduplicationKey: buildParticipationOverdueDedupKey({
            tenantId: input.tenantId,
            personId: person.id,
            kind: input.target.kind,
            entityId: input.target.entityId,
            recipientUserId,
            dueAtIso: input.target.participationResponseDueAt.toISOString(),
          }),
          preferences: pref,
        });
        if (result?.kind === "CREATED") overdueCreated++;
      }
    }
  }

  return { reminderCreated, overdueCreated };
}

export async function processParticipationDeadlineNotifications(
  now: Date = new Date(),
): Promise<ProcessParticipationDeadlineNotificationsResult> {
  const tenantRows = await prisma.trainingSession.findMany({
    where: {
      participationResponseDueAt: { not: null },
      status: "SCHEDULED",
    },
    distinct: ["tenantId"],
    select: { tenantId: true },
  });
  const eventTenantRows = await prisma.event.findMany({
    where: {
      participationResponseDueAt: { not: null },
      type: { in: ["MATCH", "TOURNAMENT"] },
      status: { not: "CANCELLED" },
    },
    distinct: ["tenantId"],
    select: { tenantId: true },
  });

  const tenantIds = [
    ...new Set([
      ...tenantRows.map((r) => r.tenantId),
      ...eventTenantRows.map((r) => r.tenantId!).filter(Boolean),
    ]),
  ];

  let reminderCreated = 0;
  let overdueCreated = 0;

  for (const tenantId of tenantIds) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true, locale: true },
    });
    const timeZone = tenant?.timezone ?? "Europe/Zurich";
    const locale = tenant?.locale ?? "de-CH";

    const sessions = await prisma.trainingSession.findMany({
      where: {
        tenantId,
        status: "SCHEDULED",
        participationResponseDueAt: { not: null },
      },
      select: {
        id: true,
        teamSeasonId: true,
        startAt: true,
        overrideStartAt: true,
        participationResponseDueAt: true,
        participationReminder1At: true,
        participationReminder2At: true,
        trainingSeries: { select: { title: true } },
      },
      take: 200,
    });

    for (const session of sessions) {
      if (!session.participationResponseDueAt) continue;
      const counts = await emitForTarget({
        tenantId,
        now,
        locale,
        timeZone,
        target: {
          kind: "TRAINING",
          entityId: session.id,
          teamSeasonId: session.teamSeasonId,
          title: session.trainingSeries.title,
          participationResponseDueAt: session.participationResponseDueAt,
          participationReminder1At: session.participationReminder1At,
          participationReminder2At: session.participationReminder2At,
          eventStartAt: session.overrideStartAt ?? session.startAt,
        },
      });
      reminderCreated += counts.reminderCreated;
      overdueCreated += counts.overdueCreated;
    }

    const events = await prisma.event.findMany({
      where: {
        tenantId,
        type: { in: ["MATCH", "TOURNAMENT"] },
        status: { not: "CANCELLED" },
        participationResponseDueAt: { not: null },
        teamSeasonId: { not: null },
      },
      select: {
        id: true,
        type: true,
        title: true,
        startAt: true,
        teamSeasonId: true,
        participationResponseDueAt: true,
        participationReminder1At: true,
        participationReminder2At: true,
      },
      take: 200,
    });

    for (const event of events) {
      if (!event.participationResponseDueAt || !event.teamSeasonId) continue;
      if (event.type !== "MATCH" && event.type !== "TOURNAMENT") continue;
      const counts = await emitForTarget({
        tenantId,
        now,
        locale,
        timeZone,
        target: {
          kind: event.type,
          entityId: event.id,
          teamSeasonId: event.teamSeasonId,
          title: event.title,
          participationResponseDueAt: event.participationResponseDueAt,
          participationReminder1At: event.participationReminder1At,
          participationReminder2At: event.participationReminder2At,
          eventStartAt: event.startAt,
        },
      });
      reminderCreated += counts.reminderCreated;
      overdueCreated += counts.overdueCreated;
    }
  }

  return {
    reminderCreated,
    overdueCreated,
    tenantsProcessed: tenantIds.length,
  };
}
