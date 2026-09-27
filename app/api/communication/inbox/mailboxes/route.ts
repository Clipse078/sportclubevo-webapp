import { NextResponse } from "next/server";
import { CommunicationCenterImapSecurity } from "@prisma/client";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { INBOX_SETTINGS_PERMISSIONS, INBOX_VIEW_PERMISSIONS } from "@/lib/communication/inbox/route-access";
import {
  createCommunicationCenterMailbox,
  listCommunicationCenterMailboxes,
} from "@/lib/communication/inbox/mailbox-service";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  await requireAnyPermission(INBOX_VIEW_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }
  const mailboxes = await listCommunicationCenterMailboxes(tenant.id);
  return NextResponse.json({ mailboxes });
}

export async function POST(request: Request): Promise<NextResponse> {
  await requireAnyPermission(INBOX_SETTINGS_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const actorUserId = session?.user?.id;
  if (!tenant || !actorUserId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  try {
    const mailbox = await createCommunicationCenterMailbox({
      tenantId: tenant.id,
      actorUserId,
      displayName: String(body.displayName ?? ""),
      emailAddress: String(body.emailAddress ?? ""),
      imapHost: String(body.imapHost ?? ""),
      imapPort: Number(body.imapPort ?? 993),
      imapSecurity: (body.imapSecurity as CommunicationCenterImapSecurity) ?? CommunicationCenterImapSecurity.TLS,
      imapUsername: String(body.imapUsername ?? ""),
      credential: String(body.credential ?? ""),
    });
    return NextResponse.json({ mailbox }, { status: 201 });
  } catch (error) {
    if (error instanceof CommunicationCenterError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    throw error;
  }
}
