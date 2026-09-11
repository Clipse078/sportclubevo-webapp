import { NextRequest, NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { createBillingProfile } from "@/lib/billing/native-billing-service";
import { serializeBillingProfile } from "@/lib/billing/native-billing-serializers";
import type { BillingProfileType } from "@prisma/client";

type RouteContext = { params: Promise<{ customerKey: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { customerKey } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;

  try {
    const profile = await createBillingProfile({
      customerKey,
      profileType: body.profileType as BillingProfileType,
      companyOrName: String(body.companyOrName ?? ""),
      street: String(body.street ?? ""),
      houseNumber: body.houseNumber ? String(body.houseNumber) : null,
      postalCode: String(body.postalCode ?? ""),
      city: String(body.city ?? ""),
      countryCode: String(body.countryCode ?? ""),
      invoiceEmail: body.invoiceEmail ? String(body.invoiceEmail) : null,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({ profile: serializeBillingProfile(profile) }, { status: 201 });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
