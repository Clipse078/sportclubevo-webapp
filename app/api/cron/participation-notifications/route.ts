/**
 * GET /api/cron/participation-notifications
 *
 * AUFGABEN-05-NOTIFY-DEADLINE — participation RSVP reminder + overdue notifications.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { processParticipationDeadlineNotifications } from "@/lib/notifications/participation-deadline-processor";
import { processPendingNotificationDeliveries } from "@/lib/notifications/delivery-processor";
import { isExternalSideEffectConfigured } from "@/lib/server/external-side-effect-policy";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !isExternalSideEffectConfigured("cron", ["CRON_SECRET"])) {
    return false;
  }
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const participation = await processParticipationDeadlineNotifications();
    const deliveries = await processPendingNotificationDeliveries();
    const summary = { participation, deliveries };
    console.info("[cron/participation-notifications] completed", summary);
    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error(
      "[cron/participation-notifications] Unexpected error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
