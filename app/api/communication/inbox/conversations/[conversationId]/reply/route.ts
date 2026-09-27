import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { INBOX_REPLY_PERMISSIONS } from "@/lib/communication/inbox/authorization";
import { replyToCommunicationCenterConversation } from "@/lib/communication/inbox/reply-service";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ conversationId: string }> };

export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  await requireAnyPermission(INBOX_REPLY_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const actorUserId = session?.user?.id;
  if (!tenant || !actorUserId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }
  const { conversationId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();
  if (!idempotencyKey) {
    return NextResponse.json({ error: "Idempotency key erforderlich." }, { status: 400 });
  }
  try {
    const result = await replyToCommunicationCenterConversation({
      tenantId: tenant.id,
      conversationId,
      actorUserId,
      bodyText: String(body.bodyText ?? ""),
      idempotencyKey,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CommunicationCenterError) {
      const status = error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    throw error;
  }
}
