import { NextRequest, NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  deleteBillingBankAccount,
  updateBillingBankAccount,
} from "@/lib/billing/native-billing-service";
import { serializeBillingBankAccountMasked } from "@/lib/billing/native-billing-serializers";
import type { BillingReferenceStrategy } from "@prisma/client";

type RouteContext = { params: Promise<{ accountId: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { accountId } = await context.params;
  try {
    await deleteBillingBankAccount({
      accountId,
      actorUserId: access.actorUserId!,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { accountId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const updated = await updateBillingBankAccount({
      accountId,
      label: body.label ? String(body.label) : undefined,
      bankName: body.bankName === undefined ? undefined : body.bankName ? String(body.bankName) : null,
      currency: body.currency ? String(body.currency) : undefined,
      iban: body.iban ? String(body.iban) : undefined,
      qrIban: body.qrIban === undefined ? undefined : body.qrIban ? String(body.qrIban) : null,
      referenceStrategy: body.referenceStrategy as BillingReferenceStrategy | undefined,
      qrrReferencePrefix:
        body.qrrReferencePrefix === undefined
          ? undefined
          : body.qrrReferencePrefix === null
            ? null
            : String(body.qrrReferencePrefix),
      creditorName: body.creditorName ? String(body.creditorName) : undefined,
      creditorAddressLine1: body.creditorAddressLine1 ? String(body.creditorAddressLine1) : undefined,
      creditorHouseNumber:
        body.creditorHouseNumber === undefined
          ? undefined
          : body.creditorHouseNumber
            ? String(body.creditorHouseNumber)
            : null,
      creditorPostalCode: body.creditorPostalCode ? String(body.creditorPostalCode) : undefined,
      creditorCity: body.creditorCity ? String(body.creditorCity) : undefined,
      creditorCountryCode: body.creditorCountryCode ? String(body.creditorCountryCode) : undefined,
      isDefault: body.isDefault === undefined ? undefined : Boolean(body.isDefault),
      deactivate: body.deactivate === true,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({ bankAccount: serializeBillingBankAccountMasked(updated) });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
