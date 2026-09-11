/**
 * GET /api/platform/billing/tenants/[tenantKey]/invoices/[invoiceId]
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  getStripeInvoiceForTenant,
  resolveTenantIdFromTenantKey,
} from "@/lib/integrations/stripe/billing-read-service";
import { billingStripeErrorResponse } from "@/lib/integrations/stripe/platform-billing-api";

type RouteContext = {
  params: Promise<{ tenantKey: string; invoiceId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.BILLING_VIEW]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { tenantKey, invoiceId } = await context.params;
  const tenantId = await resolveTenantIdFromTenantKey(tenantKey);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }

  try {
    const invoice = await getStripeInvoiceForTenant({
      tenantId,
      stripeInvoiceId: invoiceId,
    });
    return NextResponse.json({ invoice });
  } catch (error) {
    return billingStripeErrorResponse(error);
  }
}
