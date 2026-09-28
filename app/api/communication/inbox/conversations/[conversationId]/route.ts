import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { INBOX_VIEW_PERMISSIONS } from "@/lib/communication/inbox/route-access";
import { getCommunicationCenterConversationDetail } from "@/lib/communication/inbox/conversation-service";
import { serializeCommunicationCenterConversationDetailForApi } from "@/lib/communication/inbox/conversation-detail-client-dto";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, { params }: Params): Promise<NextResponse> {
  await requireAnyPermission(INBOX_VIEW_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const userId = session?.user?.id;
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }
  const { conversationId } = await params;
  try {
    const conversation = await getCommunicationCenterConversationDetail({
      tenantId: tenant.id,
      conversationId,
      userId,
    });
    const payload = serializeCommunicationCenterConversationDetailForApi(conversation);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof CommunicationCenterError) {
      const status =
        error.code === "DETAIL_SERIALIZATION_FAILED"
          ? 500
          : error.code === "NOT_FOUND" || error.code === "FORBIDDEN"
            ? 404
            : 404;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    console.error("[communication/inbox/conversation-detail] unexpected error", error);
    return NextResponse.json(
      { error: "Die Konversation konnte nicht geladen werden.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
