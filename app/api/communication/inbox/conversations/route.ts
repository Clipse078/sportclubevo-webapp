import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { INBOX_VIEW_PERMISSIONS } from "@/lib/communication/inbox/route-access";
import {
  listCommunicationCenterConversations,
  listCommunicationCenterMailboxCounts,
  type InboxConversationFilter,
} from "@/lib/communication/inbox/conversation-service";
import {
  INBOX_MAILBOX_VIEWS,
  type InboxMailboxView,
} from "@/lib/communication/inbox/inbox-mailbox-constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  await requireAnyPermission(INBOX_VIEW_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const userId = session?.user?.id;
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const filter = (request.nextUrl.searchParams.get("filter") ?? "ALL") as InboxConversationFilter;
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
  const mailboxParam = request.nextUrl.searchParams.get("mailbox") ?? "INBOX";
  const mailbox = INBOX_MAILBOX_VIEWS.includes(mailboxParam as InboxMailboxView)
    ? (mailboxParam as InboxMailboxView)
    : "INBOX";

  if (request.nextUrl.searchParams.get("counts") === "1") {
    const counts = await listCommunicationCenterMailboxCounts({
      tenantId: tenant.id,
      userId,
    });
    return NextResponse.json({ counts });
  }

  const result = await listCommunicationCenterConversations({
    tenantId: tenant.id,
    userId,
    mailbox,
    filter,
    search,
    cursor,
  });

  return NextResponse.json(result);
}
