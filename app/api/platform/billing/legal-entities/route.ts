import { NextRequest, NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  createLegalEntity,
  listLegalEntitiesForPlatform,
} from "@/lib/billing/native-billing-service";
import { serializeLegalEntity } from "@/lib/billing/native-billing-serializers";
import type { LegalEntityType } from "@prisma/client";

export async function GET() {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const entities = await listLegalEntitiesForPlatform();
  return NextResponse.json({
    legalEntities: entities.map(serializeLegalEntity),
  });
}

export async function POST(request: NextRequest) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await request.json()) as Record<string, unknown>;
  try {
    const created = await createLegalEntity({
      displayName: String(body.displayName ?? ""),
      legalName: String(body.legalName ?? ""),
      key: body.key ? String(body.key) : undefined,
      entityType: body.entityType as LegalEntityType | undefined,
      uid: body.uid ? String(body.uid) : null,
      vatId: body.vatId ? String(body.vatId) : null,
      defaultCurrency: body.defaultCurrency ? String(body.defaultCurrency) : undefined,
      addressLine1: String(body.addressLine1 ?? ""),
      houseNumber: body.houseNumber ? String(body.houseNumber) : null,
      postalCode: String(body.postalCode ?? ""),
      city: String(body.city ?? ""),
      countryCode: String(body.countryCode ?? ""),
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({ legalEntity: serializeLegalEntity(created) }, { status: 201 });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
