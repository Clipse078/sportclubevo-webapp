import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";
import {
  archiveTenantCommunicationSenderIdentity,
  setDefaultTenantCommunicationSenderIdentity,
  updateTenantCommunicationSenderIdentity,
  TenantCommunicationSenderIdentityError,
} from "@/lib/communication/sender-identity/tenant-communication-sender-identity-service";
import { EmailSenderSettingsError } from "@/lib/communication/email-sender-service";

export const dynamic = "force-dynamic";

function mapError(error: unknown): NextResponse {
  if (error instanceof TenantCommunicationSenderIdentityError) {
    const status = error.code === "NOT_FOUND" || error.code === "TENANT_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: error.message, field: error.field }, { status });
  }
  if (error instanceof EmailSenderSettingsError) {
    return NextResponse.json(
      { error: error.message, field: error.field },
      { status: error.code === "TENANT_NOT_FOUND" ? 404 : 400 },
    );
  }
  console.error("[email-senders/id]", error);
  return NextResponse.json({ error: "Absender konnte nicht verarbeitet werden." }, { status: 500 });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const access = await requireApiAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandant in der Sitzung." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const actorUserId = access.session.user.effectiveUserId ?? access.session.user.id;

  try {
    if (raw.action === "setDefault") {
      const sender = await setDefaultTenantCommunicationSenderIdentity({
        tenantId,
        senderIdentityId: id,
        actorUserId,
      });
      return NextResponse.json({ sender });
    }

    const sender = await updateTenantCommunicationSenderIdentity({
      tenantId,
      senderIdentityId: id,
      actorUserId,
      displayName: raw.displayName,
      emailAddress: raw.emailAddress,
    });
    return NextResponse.json({ sender });
  } catch (error) {
    return mapError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const access = await requireApiAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandant in der Sitzung." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const actorUserId = access.session.user.effectiveUserId ?? access.session.user.id;

  try {
    const sender = await archiveTenantCommunicationSenderIdentity({
      tenantId,
      senderIdentityId: id,
      actorUserId,
      replacementDefaultSenderIdentityId:
        typeof raw.replacementDefaultSenderIdentityId === "string"
          ? raw.replacementDefaultSenderIdentityId
          : null,
    });
    return NextResponse.json({ sender });
  } catch (error) {
    return mapError(error);
  }
}
