import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";
import {
  createTenantCommunicationSenderIdentity,
  listTenantCommunicationSenderIdentities,
  TenantCommunicationSenderIdentityError,
} from "@/lib/communication/sender-identity/tenant-communication-sender-identity-service";
import { EmailSenderSettingsError } from "@/lib/communication/email-sender-service";

export const dynamic = "force-dynamic";

function mapError(error: unknown): NextResponse {
  if (error instanceof TenantCommunicationSenderIdentityError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "TENANT_NOT_FOUND"
          ? 404
          : 400;
    return NextResponse.json({ error: error.message, field: error.field }, { status });
  }
  if (error instanceof EmailSenderSettingsError) {
    return NextResponse.json(
      { error: error.message, field: error.field },
      { status: error.code === "TENANT_NOT_FOUND" ? 404 : 400 },
    );
  }
  console.error("[email-senders]", error);
  return NextResponse.json({ error: "Absender konnten nicht verarbeitet werden." }, { status: 500 });
}

export async function GET(): Promise<NextResponse> {
  const access = await requireApiAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandant in der Sitzung." }, { status: 403 });
  }

  try {
    const senders = await listTenantCommunicationSenderIdentities(tenantId);
    return NextResponse.json({ senders });
  } catch (error) {
    return mapError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandant in der Sitzung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const actorUserId = access.session.user.effectiveUserId ?? access.session.user.id;

  try {
    const sender = await createTenantCommunicationSenderIdentity({
      tenantId,
      actorUserId,
      displayName: raw.displayName,
      emailAddress: raw.emailAddress,
      setAsDefault: raw.setAsDefault === true,
    });
    return NextResponse.json({ sender }, { status: 201 });
  } catch (error) {
    return mapError(error);
  }
}
