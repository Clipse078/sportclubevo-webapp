import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getCommunicationDeliveryAnalytics } from "@/lib/communication/analytics/communication-delivery-analytics-service";
import { requireCommunicationAnalyticsSummary } from "@/lib/communication/analytics/communication-analytics-authorization";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
} from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ communicationId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const { communicationId } = await context.params;

  try {
    await requireCommunicationAnalyticsSummary({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
      communicationId,
    });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof TeamCommunicationNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }

  const analytics = await getCommunicationDeliveryAnalytics({
    tenantId: tenant.id,
    communicationId,
  });
  if (!analytics) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ analytics });
}
