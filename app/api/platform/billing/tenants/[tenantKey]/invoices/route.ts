/**
 * GET /api/platform/billing/tenants/[tenantKey]/invoices
 *
 * Cursor-paginated invoice history for a linked tenant Stripe customer.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  getTenantInvoices,
  resolveTenantIdFromTenantKey,
} from "@/lib/integrations/stripe/billing-read-service";
import { billingStripeErrorResponse } from "@/lib/integrations/stripe/platform-billing-api";

type RouteContext = { params: Promise<{ tenantKey: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.BILLING_VIEW]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { tenantKey } = await context.params;
  const tenantId = await resolveTenantIdFromTenantKey(tenantKey);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const startingAfter = request.nextUrl.searchParams.get("startingAfter") ?? undefined;
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  try {
    const page = await getTenantInvoices({
      tenantId,
      limit: Number.isFinite(limit) ? limit : undefined,
      startingAfter,
    });
    return NextResponse.json(page);
  } catch (error) {
    return billingStripeErrorResponse(error);
  }
}
