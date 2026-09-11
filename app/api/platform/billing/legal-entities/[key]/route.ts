import { NextRequest, NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { deleteLegalEntity, updateLegalEntity } from "@/lib/billing/native-billing-service";
import { serializeLegalEntity } from "@/lib/billing/native-billing-serializers";
import { findLegalEntityByKey } from "@/lib/billing/native-billing-repository";
import type { LegalEntityStatus, LegalEntityType } from "@prisma/client";

type RouteContext = { params: Promise<{ key: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { key } = await context.params;
  const entity = await findLegalEntityByKey(key);
  if (!entity) {
    return NextResponse.json({ error: "Legal Entity nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ legalEntity: serializeLegalEntity(entity) });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { key } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const updated = await updateLegalEntity({
      entityKey: key,
      displayName: body.displayName ? String(body.displayName) : undefined,
      legalName: body.legalName ? String(body.legalName) : undefined,
      status: body.status as LegalEntityStatus | undefined,
      entityType: body.entityType as LegalEntityType | null | undefined,
      uid: body.uid === undefined ? undefined : body.uid ? String(body.uid) : null,
      vatId: body.vatId === undefined ? undefined : body.vatId ? String(body.vatId) : null,
      defaultCurrency: body.defaultCurrency ? String(body.defaultCurrency) : undefined,
      addressLine1: body.addressLine1 ? String(body.addressLine1) : undefined,
      houseNumber:
        body.houseNumber === undefined ? undefined : body.houseNumber ? String(body.houseNumber) : null,
      postalCode: body.postalCode ? String(body.postalCode) : undefined,
      city: body.city ? String(body.city) : undefined,
      countryCode: body.countryCode ? String(body.countryCode) : undefined,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({ legalEntity: serializeLegalEntity(updated) });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { key } = await context.params;
  try {
    await deleteLegalEntity({
      entityKey: key,
      actorUserId: access.actorUserId!,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
