import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listCommunicationDeliveryDetail } from "@/lib/communication/analytics/communication-delivery-analytics-service";
import { resolveCommunicationAnalyticsAccess } from "@/lib/communication/analytics/communication-analytics-authorization";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
} from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ communicationId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const { communicationId } = await context.params;

  const access = await resolveCommunicationAnalyticsAccess({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
    communicationId,
  });
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!access.canViewRecipientDetail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  try {
    const page = await listCommunicationDeliveryDetail({
      tenantId: tenant.id,
      communicationId,
      cursor,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json(page);
  } catch (error) {
    if (error instanceof TeamCommunicationNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
