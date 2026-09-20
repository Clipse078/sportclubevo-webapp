import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  markNotificationRead,
  NotificationAccessError,
} from "@/lib/notifications/read-service";
import { getNotificationRecipientContext } from "@/lib/notifications/server-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ notificationId: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const ctx = await getNotificationRecipientContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = await context.params;
  let body: { read?: boolean } = {};
  try {
    body = (await request.json()) as { read?: boolean };
  } catch {
    body = { read: true };
  }

  try {
    await markNotificationRead(
      ctx.tenantId,
      ctx.userId,
      notificationId,
      body.read !== false,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotificationAccessError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
