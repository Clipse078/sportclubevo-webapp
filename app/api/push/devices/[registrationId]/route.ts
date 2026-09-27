import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { getNotificationRecipientContext } from "@/lib/notifications/server-context";
import { revokePushDevice } from "@/lib/push/push-device-registration-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ registrationId: string }> };

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const session = await requireApiSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { registrationId } = await context.params;
  const ctx = await getNotificationRecipientContext();
  const revoked = await revokePushDevice({
    userId: session.session.user.id,
    registrationId,
    audit: {
      tenantId: ctx?.tenantId ?? null,
      actorUserId: session.session.user.id,
    },
  });

  if (!revoked) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
