import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  getDefaultNotificationPreferences,
  resolveEffectivePreference,
  type NotificationChannelDefaults,
} from "./defaults";

export type NotificationPreferenceDto = {
  notificationType: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
};

export async function listNotificationPreferencesForUser(
  tenantId: string,
  userId: string,
): Promise<NotificationPreferenceDto[]> {
  const stored = await prisma.userNotificationPreference.findMany({
    where: { tenantId, userId },
  });
  const byType = new Map(stored.map((row) => [row.notificationType, row]));
  const defaults = getDefaultNotificationPreferences();

  return (Object.keys(defaults) as NotificationType[]).map((notificationType) => {
    const effective = resolveEffectivePreference(
      notificationType,
      byType.get(notificationType)
        ? {
            inAppEnabled: byType.get(notificationType)!.inAppEnabled,
            emailEnabled: byType.get(notificationType)!.emailEnabled,
          }
        : null,
    );
    return {
      notificationType,
      inAppEnabled: effective.inAppEnabled,
      emailEnabled: effective.emailEnabled,
    };
  });
}

export async function getEffectiveNotificationPreference(
  tenantId: string,
  userId: string,
  type: NotificationType,
): Promise<NotificationChannelDefaults> {
  const row = await prisma.userNotificationPreference.findUnique({
    where: {
      tenantId_userId_notificationType: { tenantId, userId, notificationType: type },
    },
  });
  return resolveEffectivePreference(
    type,
    row ? { inAppEnabled: row.inAppEnabled, emailEnabled: row.emailEnabled } : null,
  );
}

export async function upsertNotificationPreference(
  tenantId: string,
  userId: string,
  input: {
    notificationType: NotificationType;
    inAppEnabled: boolean;
    emailEnabled: boolean;
  },
): Promise<NotificationPreferenceDto> {
  const row = await prisma.userNotificationPreference.upsert({
    where: {
      tenantId_userId_notificationType: {
        tenantId,
        userId,
        notificationType: input.notificationType,
      },
    },
    create: {
      tenantId,
      userId,
      notificationType: input.notificationType,
      inAppEnabled: input.inAppEnabled,
      emailEnabled: input.emailEnabled,
    },
    update: {
      inAppEnabled: input.inAppEnabled,
      emailEnabled: input.emailEnabled,
    },
  });

  return {
    notificationType: row.notificationType,
    inAppEnabled: row.inAppEnabled,
    emailEnabled: row.emailEnabled,
  };
}

type PreferenceDb = Prisma.TransactionClient | typeof prisma;

export async function loadEffectivePreferencesForUsers(
  tx: PreferenceDb,
  tenantId: string,
  userIds: string[],
  type: NotificationType,
): Promise<Map<string, NotificationChannelDefaults>> {
  const unique = [...new Set(userIds)];
  const rows = await tx.userNotificationPreference.findMany({
    where: { tenantId, userId: { in: unique }, notificationType: type },
  });
  const map = new Map<string, NotificationChannelDefaults>();
  for (const userId of unique) {
    const row = rows.find((r) => r.userId === userId);
    map.set(
      userId,
      resolveEffectivePreference(
        type,
        row ? { inAppEnabled: row.inAppEnabled, emailEnabled: row.emailEnabled } : null,
      ),
    );
  }
  return map;
}
