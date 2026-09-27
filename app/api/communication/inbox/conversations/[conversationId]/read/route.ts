import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { INBOX_VIEW_PERMISSIONS } from "@/lib/communication/inbox/route-access";
import { markCommunicationCenterConversationRead } from "@/lib/communication/inbox/conversation-service";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ conversationId: string }> };

export async function POST(_request: Request, { params }: Params): Promise<NextResponse> {
  await requireAnyPermission(INBOX_VIEW_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const userId = session?.user?.id;
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }
  const { conversationId } = await params;
  try {
    await markCommunicationCenterConversationRead({
      tenantId: tenant.id,
      conversationId,
      userId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CommunicationCenterError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
    }
    throw error;
  }
}
