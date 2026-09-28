import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERSONAL_SIGNATURE_ROUTE_PERMISSIONS } from "@/lib/communication/personal-signature/route-access";
import {
  loadPersonalSignaturePreference,
  resetPersonalSignaturePreference,
  savePersonalSignaturePreference,
} from "@/lib/communication/personal-signature/personal-signature-service";

export const dynamic = "force-dynamic";

async function actorContext() {
  await requireAnyPermission(PERSONAL_SIGNATURE_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const userId = session?.user?.id;
  if (!tenant || !userId) {
    return null;
  }
  return { tenantId: tenant.id, userId };
}

export async function GET(): Promise<NextResponse> {
  const actor = await actorContext();
  if (!actor) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const preference = await loadPersonalSignaturePreference(actor.tenantId, actor.userId);
  return NextResponse.json({ preference });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const actor = await actorContext();
  if (!actor) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  if (body.userId && body.userId !== actor.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (body.tenantId && body.tenantId !== actor.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await savePersonalSignaturePreference(actor.tenantId, actor.userId, {
    bodyText: body.bodyText,
    useByDefault: body.useByDefault,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.code, message: result.message }, { status: 400 });
  }

  return NextResponse.json({ preference: result.preference });
}

export async function DELETE(): Promise<NextResponse> {
  const actor = await actorContext();
  if (!actor) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const preference = await resetPersonalSignaturePreference(actor.tenantId, actor.userId);
  return NextResponse.json({ preference });
}
