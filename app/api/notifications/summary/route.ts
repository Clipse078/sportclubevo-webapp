import { NextResponse } from "next/server";
import { getNotificationHeaderSummary } from "@/lib/notifications/read-service";
import { getNotificationRecipientContext } from "@/lib/notifications/server-context";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const ctx = await getNotificationRecipientContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getNotificationHeaderSummary(ctx.tenantId, ctx.userId);
  return NextResponse.json(summary);
}
