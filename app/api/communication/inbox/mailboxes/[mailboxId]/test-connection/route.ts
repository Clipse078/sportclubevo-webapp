import { NextResponse } from "next/server";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { INBOX_SETTINGS_PERMISSIONS } from "@/lib/communication/inbox/route-access";
import { testCommunicationCenterMailboxConnection } from "@/lib/communication/inbox/mailbox-service";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ mailboxId: string }> };

export async function POST(_request: Request, { params }: Params): Promise<NextResponse> {
  await requireAnyPermission(INBOX_SETTINGS_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }
  const { mailboxId } = await params;
  try {
    const result = await testCommunicationCenterMailboxConnection({
      tenantId: tenant.id,
      mailboxId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CommunicationCenterError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
    }
    throw error;
  }
}
