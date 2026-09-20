/**
 * GET /api/cron/task-notifications
 *
 * AUFGABEN-04N — deadline notification generation + email delivery pipeline.
 * Authorization: Bearer ${CRON_SECRET} (fail closed when unset).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { processTaskDeadlineNotifications } from "@/lib/notifications/deadline-processor";
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
    const deadlines = await processTaskDeadlineNotifications();
    const deliveries = await processPendingNotificationDeliveries();
    const summary = { deadlines, deliveries };
    console.info("[cron/task-notifications] completed", summary);
    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error(
      "[cron/task-notifications] Unexpected error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
