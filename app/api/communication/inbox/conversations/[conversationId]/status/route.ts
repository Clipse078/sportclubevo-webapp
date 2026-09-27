import { NextResponse } from "next/server";
import { CommunicationCenterConversationStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { INBOX_MANAGE_PERMISSIONS } from "@/lib/communication/inbox/authorization";
import { setCommunicationCenterConversationStatus } from "@/lib/communication/inbox/conversation-service";
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
  const status = body.status as CommunicationCenterConversationStatus;
  if (
    status !== CommunicationCenterConversationStatus.OPEN &&
    status !== CommunicationCenterConversationStatus.RESOLVED
  ) {
    return NextResponse.json({ error: "Ungültiger Status." }, { status: 400 });
  }
  try {
    await setCommunicationCenterConversationStatus({
      tenantId: tenant.id,
      conversationId,
      actorUserId,
      status,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CommunicationCenterError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
    }
    throw error;
  }
}
