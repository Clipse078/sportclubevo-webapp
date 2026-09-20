import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NotificationType } from "@prisma/client";
import {
  listNotificationPreferencesForUser,
  upsertNotificationPreference,
} from "@/lib/notifications/preference-service";
import { getNotificationRecipientContext } from "@/lib/notifications/server-context";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set<string>([
  "TASK_ASSIGNED",
  "SUBTASK_ASSIGNED",
  "TASK_DUE_SOON",
  "TASK_OVERDUE",
  "TASK_DEADLINE_CHANGED",
  "TASK_REMINDER",
]);

export async function GET(): Promise<NextResponse> {
  const ctx = await getNotificationRecipientContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await listNotificationPreferencesForUser(ctx.tenantId, ctx.userId);
  return NextResponse.json({ preferences });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const ctx = await getNotificationRecipientContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    notificationType?: string;
    inAppEnabled?: boolean;
    emailEnabled?: boolean;
  };

  if (!body.notificationType || !VALID_TYPES.has(body.notificationType)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (typeof body.inAppEnabled !== "boolean" || typeof body.emailEnabled !== "boolean") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const preference = await upsertNotificationPreference(ctx.tenantId, ctx.userId, {
    notificationType: body.notificationType as NotificationType,
    inAppEnabled: body.inAppEnabled,
    emailEnabled: body.emailEnabled,
  });

  return NextResponse.json({ preference });
}
