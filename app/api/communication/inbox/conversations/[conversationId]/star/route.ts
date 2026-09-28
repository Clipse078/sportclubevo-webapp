import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { INBOX_VIEW_PERMISSIONS } from "@/lib/communication/inbox/route-access";
import { setCommunicationCenterConversationStarred } from "@/lib/communication/inbox/user-conversation-state-service";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ conversationId: string }> };

export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  await requireAnyPermission(INBOX_VIEW_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const userId = session?.user?.id;
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  let starred = true;
  try {
    const body = (await request.json()) as { starred?: unknown };
    if (typeof body.starred === "boolean") {
      starred = body.starred;
    }
  } catch {
    // Default starred=true when body omitted.
  }

  const { conversationId } = await params;
  try {
    await setCommunicationCenterConversationStarred({
      tenantId: tenant.id,
      conversationId,
      userId,
      starred,
    });
    return NextResponse.json({ ok: true, starred });
  } catch (error) {
    if (error instanceof CommunicationCenterError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
    }
    throw error;
  }
}
