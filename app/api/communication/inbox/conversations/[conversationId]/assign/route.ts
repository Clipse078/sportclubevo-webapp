import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { INBOX_MANAGE_PERMISSIONS } from "@/lib/communication/inbox/authorization";
import { assignCommunicationCenterConversation } from "@/lib/communication/inbox/conversation-service";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ conversationId: string }> };

export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  await requireAnyPermission(INBOX_MANAGE_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const actorUserId = session?.user?.id;
  if (!tenant || !actorUserId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }
  const { conversationId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const assignedToUserId =
    body.assignedToUserId === null || body.assignedToUserId === undefined
      ? null
      : String(body.assignedToUserId);
  try {
    await assignCommunicationCenterConversation({
      tenantId: tenant.id,
      conversationId,
      actorUserId,
      assignedToUserId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CommunicationCenterError) {
      const status = error.code === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    throw error;
  }
}
