import { NextRequest, NextResponse } from "next/server";
import { suspendPlatformTenant } from "@/lib/tenants/platform-tenant-lifecycle-service";
import type { SuspensionBillingBehavior } from "@/lib/tenants/tenant-lifecycle-types";
import {
  lifecycleFailureResponse,
  requireBillingManageActor,
  resolveTenantIdFromRouteKey,
} from "../_shared";

type RouteContext = { params: Promise<{ tenantKey: string }> };

const REASONS = new Set(["NON_PAYMENT", "ADMINISTRATIVE", "OTHER"]);
const BILLING = new Set(["KEEP_BILLING", "SCHEDULE_CANCELLATION"]);

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
  const billingBehavior =
    typeof body?.billingBehavior === "string" ? body.billingBehavior : "KEEP_BILLING";
  const reasonNote =
    typeof body?.reasonNote === "string" ? body.reasonNote.slice(0, 500) : null;

  if (!REASONS.has(reason)) {
    return NextResponse.json({ error: "Ungültiger Sperrgrund." }, { status: 400 });
  }
  if (!BILLING.has(billingBehavior)) {
    return NextResponse.json(
      { error: "Ungültige Abrechnungsoption während der Sperrung." },
      { status: 400 },
    );
  }

  const result = await suspendPlatformTenant({
    tenantId,
    actorUserId: auth.actorUserId,
    reason: reason as "NON_PAYMENT" | "ADMINISTRATIVE" | "OTHER",
    reasonNote,
    billingBehavior: billingBehavior as SuspensionBillingBehavior,
    actionSource: "MANUAL",
  });

  if (!result.ok) {
    return lifecycleFailureResponse(result);
  }

  return NextResponse.json({ result });
}
