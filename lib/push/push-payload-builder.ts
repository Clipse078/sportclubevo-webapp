import type { NotificationEntityType, NotificationType } from "@prisma/client";
import { PUSH_BODY_PREVIEW_MAX_LENGTH } from "@/lib/push/constants";

export type PushPayload = {
  title: string;
  body: string;
  priority: "normal" | "high";
  data: {
    href: string;
    tenantId: string;
    notificationType: NotificationType;
    entityType: NotificationEntityType | null;
    entityId: string | null;
  };
};

function truncatePreview(text: string, maxLength: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function buildPushPayloadFromNotification(input: {
  tenantId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  entityType: NotificationEntityType | null;
  entityId: string | null;
}): PushPayload {
  return {
    title: truncatePreview(input.title, 80),
    body: truncatePreview(input.body, PUSH_BODY_PREVIEW_MAX_LENGTH),
    priority:
      input.type === "TEAM_ALERT_PUBLISHED" || input.type === "CLUB_ALERT_PUBLISHED"
        ? "high"
        : "normal",
    data: {
      href: input.href,
      tenantId: input.tenantId,
      notificationType: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  };
}
