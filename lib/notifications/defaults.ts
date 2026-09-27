import type { NotificationType } from "@prisma/client";

export type NotificationChannelDefaults = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
};

const DEFAULTS: Record<NotificationType, NotificationChannelDefaults> = {
  TASK_ASSIGNED: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  SUBTASK_ASSIGNED: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  TASK_DUE_SOON: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  TASK_OVERDUE: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  TASK_DEADLINE_CHANGED: { inAppEnabled: true, emailEnabled: false, pushEnabled: false },
  TASK_REMINDER: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  TASK_MENTION: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  TASK_COMMENT: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  PARTICIPATION_REMINDER: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  PARTICIPATION_OVERDUE: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  REQUIREMENT_ASSIGNED: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  REQUIREMENT_REMINDER: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  REQUIREMENT_OVERDUE: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  REQUIREMENT_CHANGED: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  REQUIREMENT_CANCELLED: { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
  TEAM_COMMUNICATION_PUBLISHED: { inAppEnabled: true, emailEnabled: false, pushEnabled: true },
  TEAM_ANNOUNCEMENT_PUBLISHED: { inAppEnabled: true, emailEnabled: false, pushEnabled: true },
  TEAM_ALERT_PUBLISHED: { inAppEnabled: true, emailEnabled: false, pushEnabled: true },
  TEAM_POLL_PUBLISHED: { inAppEnabled: true, emailEnabled: false, pushEnabled: true },
  TEAM_DATE_POLL_PUBLISHED: { inAppEnabled: true, emailEnabled: false, pushEnabled: true },
  TEAM_REQUEST_PUBLISHED: { inAppEnabled: true, emailEnabled: false, pushEnabled: true },
  CLUB_COMMUNICATION_PUBLISHED: { inAppEnabled: true, emailEnabled: false, pushEnabled: true },
  CLUB_ANNOUNCEMENT_PUBLISHED: { inAppEnabled: true, emailEnabled: false, pushEnabled: true },
  CLUB_ALERT_PUBLISHED: { inAppEnabled: true, emailEnabled: false, pushEnabled: true },
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
    pushEnabled: stored.pushEnabled,
  };
}
