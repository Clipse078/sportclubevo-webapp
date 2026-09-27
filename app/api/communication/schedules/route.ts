import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listUpcomingPublicationSchedules } from "@/lib/communication/scheduling/publication-schedule-service";
import { requireClubCommunicationView } from "@/lib/communication/club/club-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    await requireClubCommunicationView({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const schedules = await listUpcomingPublicationSchedules({ tenantId: tenant.id });
  return NextResponse.json({ schedules });
}
