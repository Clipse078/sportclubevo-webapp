import type { NotificationType } from "@prisma/client";

export type NotificationChannelDefaults = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
};

const DEFAULTS: Record<NotificationType, NotificationChannelDefaults> = {
  TASK_ASSIGNED: { inAppEnabled: true, emailEnabled: true },
  SUBTASK_ASSIGNED: { inAppEnabled: true, emailEnabled: true },
  TASK_DUE_SOON: { inAppEnabled: true, emailEnabled: true },
  TASK_OVERDUE: { inAppEnabled: true, emailEnabled: true },
  TASK_DEADLINE_CHANGED: { inAppEnabled: true, emailEnabled: false },
  TASK_REMINDER: { inAppEnabled: true, emailEnabled: true },
  TASK_MENTION: { inAppEnabled: true, emailEnabled: true },
  PARTICIPATION_REMINDER: { inAppEnabled: true, emailEnabled: true },
  PARTICIPATION_OVERDUE: { inAppEnabled: true, emailEnabled: true },
};

export function getDefaultNotificationPreferences(): Record<
  NotificationType,
  NotificationChannelDefaults
> {
  return { ...DEFAULTS };
}

export function resolveEffectivePreference(
  type: NotificationType,
  stored: NotificationChannelDefaults | null,
): NotificationChannelDefaults {
  const base = DEFAULTS[type];
  if (!stored) return base;
  return {
    inAppEnabled: stored.inAppEnabled,
    emailEnabled: stored.emailEnabled,
  };
}
