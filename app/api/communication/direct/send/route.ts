import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/direct/route-access";
import {
  sendDirectMessage,
  type DirectMessageMode,
} from "@/lib/communication/direct/direct-message-service";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";

export const dynamic = "force-dynamic";

function parseMode(value: unknown): DirectMessageMode {
  if (value === "INFORM" || value === "NUR_INFORMIEREN") return "INFORM";
  return "MESSAGE";
}

export async function POST(request: Request): Promise<NextResponse> {
  await requireAnyPermission(DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const userId = session?.user?.id;
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const recipientPersonIds = Array.isArray(body.recipientPersonIds)
    ? body.recipientPersonIds.map(String)
    : [];
  const channelIntent =
    body.channelIntent && typeof body.channelIntent === "object"
      ? (body.channelIntent as { inApp?: boolean; push?: boolean; email?: boolean })
      : undefined;
  const attachmentIds = Array.isArray(body.attachmentIds)
    ? body.attachmentIds.map(String)
    : [];
  const emailSenderIdentityId =
    typeof body.emailSenderIdentityId === "string" ? body.emailSenderIdentityId.trim() : null;

  try {
    const result = await sendDirectMessage({
      tenantId: tenant.id,
      senderUserId: userId,
      recipientPersonIds,
      subject: body.subject != null ? String(body.subject) : null,
      bodyText: String(body.bodyText ?? ""),
      mode: parseMode(body.mode),
      channelIntent,
      includePersonalSignature:
        body.includePersonalSignature === true
          ? true
          : body.includePersonalSignature === false
            ? false
            : undefined,
      attachmentIds,
      emailSenderIdentityId: emailSenderIdentityId || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof TeamCommunicationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
