import { NextResponse } from "next/server";
import { reconcileTenantDunning } from "@/lib/billing/platform-dunning-service";
import { findBillingAccountByTenantId } from "@/lib/billing/tenant-billing-account-repository";
import { toDunningSnapshot } from "@/lib/billing/dunning-snapshot";
import {
  requireBillingManageActor,
  resolveTenantIdFromRouteKey,
} from "../../lifecycle/_shared";

type RouteContext = { params: Promise<{ tenantKey: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireBillingManageActor();
  if (!auth.ok) {
    return auth.response;
  }

  const { tenantKey } = await context.params;
  const tenantId = await resolveTenantIdFromRouteKey(tenantKey);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }

  const account = await findBillingAccountByTenantId(tenantId);
  if (!account) {
    return NextResponse.json({ error: "Keine Billing-Verknüpfung." }, { status: 404 });
  }

  await reconcileTenantDunning(tenantId);
  const refreshed = await findBillingAccountByTenantId(tenantId);
  const dunning = refreshed
    ? toDunningSnapshot(refreshed, refreshed.dunningStatus === "REQUIRES_REVIEW")
    : null;

  return NextResponse.json({ dunning });
}
