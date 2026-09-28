import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/direct/route-access";
import { searchDirectMessageRecipients } from "@/lib/communication/direct/direct-recipient-search";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  await requireAnyPermission(DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const userId = session?.user?.id;
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const recipients = await searchDirectMessageRecipients({
      tenantId: tenant.id,
      senderUserId: userId,
      query: q,
    });
    return NextResponse.json({ recipients });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
