import { NextRequest, NextResponse } from "next/server";
import {
  clearDunningExemption,
  setDunningExemption,
} from "@/lib/billing/platform-dunning-service";
import { toDunningSnapshot } from "@/lib/billing/dunning-snapshot";
import { findBillingAccountByTenantId } from "@/lib/billing/tenant-billing-account-repository";
import {
  requireBillingManageActor,
  resolveTenantIdFromRouteKey,
} from "../../lifecycle/_shared";

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
  const exemptUntilRaw = typeof body?.exemptUntil === "string" ? body.exemptUntil : "";
  const exemptUntil = new Date(exemptUntilRaw);
  if (Number.isNaN(exemptUntil.getTime())) {
    return NextResponse.json({ error: "Ungültiges Datum." }, { status: 400 });
  }

  const account = await findBillingAccountByTenantId(tenantId);
  if (!account) {
    return NextResponse.json({ error: "Keine Billing-Verknüpfung." }, { status: 404 });
  }

  await setDunningExemption({
    tenantId,
    exemptUntil,
    note: typeof body?.note === "string" ? body.note : null,
    actorUserId: auth.actorUserId,
  });

  const refreshed = await findBillingAccountByTenantId(tenantId);
  const dunning = refreshed
    ? toDunningSnapshot(refreshed, refreshed.dunningStatus === "REQUIRES_REVIEW")
    : null;

  return NextResponse.json({ dunning });
}

export async function DELETE(_request: Request, context: RouteContext) {
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

  await clearDunningExemption({
    tenantId,
    actorUserId: auth.actorUserId,
  });

  const refreshed = await findBillingAccountByTenantId(tenantId);
  const dunning = refreshed
    ? toDunningSnapshot(refreshed, refreshed.dunningStatus === "REQUIRES_REVIEW")
    : null;

  return NextResponse.json({ dunning });
}
