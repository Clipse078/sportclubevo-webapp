import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/notifications/read-service";
import { getNotificationRecipientContext } from "@/lib/notifications/server-context";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const ctx = await getNotificationRecipientContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updated = await markAllNotificationsRead(ctx.tenantId, ctx.userId);
  return NextResponse.json({ updated });
}
