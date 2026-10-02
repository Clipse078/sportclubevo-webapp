import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { getDashboardQuickAccessActorContext } from "@/lib/dashboard/quick-access/server-context";
import { loadSportingActivityDetail } from "@/lib/sporting-activity-detail/load-sporting-activity-detail";

export const dynamic = "force-dynamic";

const NOT_AVAILABLE = "Diese Aktivität ist nicht mehr verfügbar.";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const actor = await getDashboardQuickAccessActorContext();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get("trainingSessionId");
  const eventId = request.nextUrl.searchParams.get("eventId");

  if ((!sessionId && !eventId) || (sessionId && eventId)) {
    return NextResponse.json({ error: NOT_AVAILABLE }, { status: 404 });
  }

  const { platform, tenant: tenantPerms } = await getRequestEffectivePermissions(
    actor.userId,
    actor.tenantId,
  );
  const permissionKeys = [...platform, ...tenantPerms] as PermissionKey[];

  const result = await loadSportingActivityDetail({
    tenantId: actor.tenantId,
    userId: actor.userId,
    permissionKeys,
    ref: sessionId
      ? { kind: "training-session", sessionId }
      : { kind: "event", eventId: eventId! },
  });

  if (!result.ok) {
    return NextResponse.json({ error: NOT_AVAILABLE }, { status: 404 });
  }

  return NextResponse.json({ detail: result.detail });
}
