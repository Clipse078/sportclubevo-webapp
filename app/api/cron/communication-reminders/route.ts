/**
 * GET /api/cron/communication-reminders — SCE-COMM-10 scheduled smart reminders.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { processDueCommunicationReminderSchedules } from "@/lib/communication/smart-reminders/reminder-schedule-processor";
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
    const reminders = await processDueCommunicationReminderSchedules();
    console.info("[cron/communication-reminders] completed", reminders);
    return NextResponse.json(reminders, { status: 200 });
  } catch (err) {
    console.error(
      "[cron/communication-reminders] Unexpected error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
