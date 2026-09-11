import { NextRequest, NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  linkBillingCustomerToTenant,
  unlinkBillingCustomerFromTenant,
} from "@/lib/billing/native-billing-service";
import { serializeBillingCustomerTenantLink } from "@/lib/billing/native-billing-serializers";

type RouteContext = { params: Promise<{ customerKey: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { customerKey } = await context.params;
  const body = (await request.json()) as { tenantKey?: string; linkRole?: string };
  if (!body.tenantKey?.trim()) {
    return NextResponse.json({ error: "tenantKey ist erforderlich." }, { status: 400 });
  }

  try {
    const link = await linkBillingCustomerToTenant({
      customerKey,
      tenantKey: body.tenantKey,
      linkRole: body.linkRole ?? null,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json(
      { link: serializeBillingCustomerTenantLink(link) },
      { status: 201 },
    );
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { customerKey } = await context.params;
  const tenantKey = request.nextUrl.searchParams.get("tenantKey");
  if (!tenantKey?.trim()) {
    return NextResponse.json({ error: "tenantKey Query-Parameter ist erforderlich." }, { status: 400 });
  }

  try {
    const link = await unlinkBillingCustomerFromTenant({
      customerKey,
      tenantKey,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({ link: serializeBillingCustomerTenantLink(link) });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
