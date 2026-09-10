import { NextRequest, NextResponse } from "next/server";
import { terminatePlatformTenant } from "@/lib/tenants/platform-tenant-lifecycle-service";
import {
  lifecycleFailureResponse,
  requireBillingManageActor,
  resolveTenantIdFromRouteKey,
} from "../_shared";

type RouteContext = { params: Promise<{ tenantKey: string }> };

const REASONS = new Set(["CONTRACT_ENDED", "CUSTOMER_REQUEST", "ADMINISTRATIVE", "OTHER"]);

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
  const reason = typeof body?.reason === "string" ? body.reason : "";
  const reasonNote =
    typeof body?.reasonNote === "string" ? body.reasonNote.slice(0, 500) : null;
  const confirmed = body?.confirmed === true;

  if (!confirmed) {
    return NextResponse.json(
      { error: "Bitte bestätigen Sie die Vertragsbeendigung." },
      { status: 400 },
    );
  }

  if (!REASONS.has(reason)) {
    return NextResponse.json({ error: "Ungültiger Kündigungsgrund." }, { status: 400 });
  }

  const result = await terminatePlatformTenant({
    tenantId,
    actorUserId: auth.actorUserId,
    reason: reason as "CONTRACT_ENDED" | "CUSTOMER_REQUEST" | "ADMINISTRATIVE" | "OTHER",
    reasonNote,
  });

  if (!result.ok) {
    return lifecycleFailureResponse(result);
  }

  return NextResponse.json({ result });
}
