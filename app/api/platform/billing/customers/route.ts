import { NextRequest, NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  createBillingCustomer,
  getBillingCustomersOverview,
} from "@/lib/billing/native-billing-service";
import {
  serializeBillingCustomer,
  serializeBillingCustomerTenantLink,
} from "@/lib/billing/native-billing-serializers";

export async function GET() {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const customers = await getBillingCustomersOverview();
  return NextResponse.json({
    customers: customers.map((row) => ({
      ...serializeBillingCustomer(row),
      tenantLinks: row.tenantLinks.map(serializeBillingCustomerTenantLink),
    })),
  });
}

export async function POST(request: NextRequest) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await request.json()) as Record<string, unknown>;
  try {
    const created = await createBillingCustomer({
      displayName: String(body.displayName ?? ""),
      key: body.key ? String(body.key) : undefined,
      legalName: body.legalName ? String(body.legalName) : null,
      primaryEmail: body.primaryEmail ? String(body.primaryEmail) : null,
      defaultLanguage: body.defaultLanguage ? String(body.defaultLanguage) : null,
      defaultCurrency: body.defaultCurrency ? String(body.defaultCurrency) : null,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({ customer: serializeBillingCustomer(created) }, { status: 201 });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
