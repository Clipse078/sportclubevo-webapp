import { NextRequest, NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  getBillingCustomerDetail,
  updateBillingCustomer,
} from "@/lib/billing/native-billing-service";
import {
  serializeBillingCustomer,
  serializeBillingCustomerTenantLink,
  serializeBillingProfile,
} from "@/lib/billing/native-billing-serializers";
import { NativeBillingNotFoundError } from "@/lib/billing/native-billing-types";

type RouteContext = { params: Promise<{ customerKey: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { customerKey } = await context.params;
  try {
    const detail = await getBillingCustomerDetail(customerKey);
    return NextResponse.json({
      customer: serializeBillingCustomer(detail.customer),
      tenantLinks: detail.tenantLinks.map(serializeBillingCustomerTenantLink),
      profiles: detail.profiles.map(serializeBillingProfile),
    });
  } catch (error) {
    if (error instanceof NativeBillingNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return nativeBillingErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { customerKey } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const updated = await updateBillingCustomer({
      customerKey,
      displayName: body.displayName ? String(body.displayName) : undefined,
      legalName: body.legalName === undefined ? undefined : body.legalName ? String(body.legalName) : null,
      status: body.status as undefined,
      primaryEmail:
        body.primaryEmail === undefined
          ? undefined
          : body.primaryEmail
            ? String(body.primaryEmail)
            : null,
      defaultLanguage:
        body.defaultLanguage === undefined
          ? undefined
          : body.defaultLanguage
            ? String(body.defaultLanguage)
            : null,
      defaultCurrency:
        body.defaultCurrency === undefined
          ? undefined
          : body.defaultCurrency
            ? String(body.defaultCurrency)
            : null,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({ customer: serializeBillingCustomer(updated) });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
