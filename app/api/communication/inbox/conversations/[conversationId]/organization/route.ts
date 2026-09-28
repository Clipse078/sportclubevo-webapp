import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { INBOX_MANAGE_PERMISSIONS } from "@/lib/communication/inbox/route-access";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";
import {
  archiveCommunicationCenterConversation,
  restoreCommunicationCenterConversationFromTrash,
  restoreCommunicationCenterConversationToInbox,
  trashCommunicationCenterConversation,
} from "@/lib/communication/inbox/mailbox-organization-service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ conversationId: string }> };
type OrganizationAction = "ARCHIVE" | "RESTORE_TO_INBOX" | "TRASH" | "RESTORE_FROM_TRASH";

export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  await requireAnyPermission(INBOX_MANAGE_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const userId = session?.user?.id;
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const body = (await request.json()) as { action?: OrganizationAction };
  const { conversationId } = await params;

  try {
    switch (body.action) {
      case "ARCHIVE":
        await archiveCommunicationCenterConversation({
          tenantId: tenant.id,
          conversationId,
          actorUserId: userId,
        });
        break;
      case "RESTORE_TO_INBOX":
        await restoreCommunicationCenterConversationToInbox({
          tenantId: tenant.id,
          conversationId,
          actorUserId: userId,
        });
        break;
      case "TRASH":
        await trashCommunicationCenterConversation({
          tenantId: tenant.id,
          conversationId,
          actorUserId: userId,
        });
        break;
      case "RESTORE_FROM_TRASH":
        await restoreCommunicationCenterConversationFromTrash({
          tenantId: tenant.id,
          conversationId,
          actorUserId: userId,
        });
        break;
      default:
        return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CommunicationCenterError) {
      const status = error.code === "INVALID_STATE" ? 409 : 404;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    throw error;
  }
}
