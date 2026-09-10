/**
 * GET /api/platform/billing/tenants/[tenantKey]/summary
 *
 * Platform read-only tenant billing summary (Stripe-backed).
 * Requires billing.view. Tenant key resolves server-side only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  getTenantBillingSummary,
  resolveTenantIdFromTenantKey,
} from "@/lib/integrations/stripe/billing-read-service";
import { billingStripeErrorResponse } from "@/lib/integrations/stripe/platform-billing-api";

type RouteContext = { params: Promise<{ tenantKey: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.BILLING_VIEW]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { tenantKey } = await context.params;
  const tenantId = await resolveTenantIdFromTenantKey(tenantKey);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }

  try {
    const summary = await getTenantBillingSummary(tenantId);
    return NextResponse.json({ summary });
  } catch (error) {
    return billingStripeErrorResponse(error);
  }
}
