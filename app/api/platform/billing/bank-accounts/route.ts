import { NextRequest, NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  createBillingBankAccount,
  listBillingBankAccountsForPlatform,
} from "@/lib/billing/native-billing-service";
import { serializeBillingBankAccountMasked } from "@/lib/billing/native-billing-serializers";
import type { BillingReferenceStrategy } from "@prisma/client";

export async function GET() {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const accounts = await listBillingBankAccountsForPlatform();
  return NextResponse.json({
    bankAccounts: accounts.map(serializeBillingBankAccountMasked),
  });
}

export async function POST(request: NextRequest) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await request.json()) as Record<string, unknown>;
  try {
    const created = await createBillingBankAccount({
      legalEntityKey: String(body.legalEntityKey ?? ""),
      label: String(body.label ?? ""),
      bankName: body.bankName ? String(body.bankName) : null,
      currency: body.currency ? String(body.currency) : undefined,
      iban: String(body.iban ?? ""),
      qrIban: body.qrIban ? String(body.qrIban) : null,
      referenceStrategy: body.referenceStrategy as BillingReferenceStrategy | undefined,
      creditorName: String(body.creditorName ?? ""),
      creditorAddressLine1: String(body.creditorAddressLine1 ?? ""),
      creditorHouseNumber: body.creditorHouseNumber ? String(body.creditorHouseNumber) : null,
      creditorPostalCode: String(body.creditorPostalCode ?? ""),
      creditorCity: String(body.creditorCity ?? ""),
      creditorCountryCode: String(body.creditorCountryCode ?? ""),
      isDefault: body.isDefault === true,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json(
      { bankAccount: serializeBillingBankAccountMasked(created) },
      { status: 201 },
    );
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
