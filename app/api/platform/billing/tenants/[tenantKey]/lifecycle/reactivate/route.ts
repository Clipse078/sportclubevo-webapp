import { NextRequest, NextResponse } from "next/server";
import { reactivatePlatformTenant } from "@/lib/tenants/platform-tenant-lifecycle-service";
import {
  lifecycleFailureResponse,
  requireBillingManageActor,
  resolveTenantIdFromRouteKey,
} from "../_shared";

type RouteContext = { params: Promise<{ tenantKey: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireBillingManageActor();
  if (!auth.ok) {
    return auth.response;
  }

  const { tenantKey } = await context.params;
  const tenantId = await resolveTenantIdFromRouteKey(tenantKey);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const undoScheduledStripeCancellation = Boolean(body?.undoScheduledStripeCancellation);

  const result = await reactivatePlatformTenant({
    tenantId,
    actorUserId: auth.actorUserId,
    undoScheduledStripeCancellation,
  });

  if (!result.ok) {
    return lifecycleFailureResponse(result);
  }

  return NextResponse.json({ result });
}
