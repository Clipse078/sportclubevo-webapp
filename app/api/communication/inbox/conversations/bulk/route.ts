import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import {
  INBOX_MANAGE_PERMISSIONS,
  INBOX_VIEW_PERMISSIONS,
} from "@/lib/communication/inbox/route-access";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";
import {
  bulkApplyCommunicationCenterOrganizationAction,
  type InboxBulkOrganizationAction,
} from "@/lib/communication/inbox/mailbox-organization-service";
import {
  bulkApplyCommunicationCenterUserStateAction,
  type InboxBulkUserStateAction,
} from "@/lib/communication/inbox/user-conversation-state-service";

export const dynamic = "force-dynamic";

const ORGANIZATION_ACTIONS = new Set<InboxBulkOrganizationAction>([
  "ARCHIVE",
  "RESTORE_TO_INBOX",
  "TRASH",
  "RESTORE_FROM_TRASH",
]);

const USER_STATE_ACTIONS = new Set<InboxBulkUserStateAction>([
  "MARK_READ",
  "MARK_UNREAD",
  "STAR",
  "UNSTAR",
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const tenant = await getActiveTenant();
  const session = await auth();
  const userId = session?.user?.id;
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const { conversationIds, action } = body as {
    conversationIds?: unknown;
    action?: unknown;
  };

  if (
    !Array.isArray(conversationIds) ||
    conversationIds.some((id) => typeof id !== "string" || !id.trim())
  ) {
    return NextResponse.json(
      { error: "conversationIds muss ein Array von Konversations-IDs sein." },
      { status: 400 },
    );
  }

  if (typeof action !== "string") {
    return NextResponse.json({ error: "action ist erforderlich." }, { status: 400 });
  }

  try {
    if (ORGANIZATION_ACTIONS.has(action as InboxBulkOrganizationAction)) {
      await requireAnyPermission(INBOX_MANAGE_PERMISSIONS);
      const result = await bulkApplyCommunicationCenterOrganizationAction({
        tenantId: tenant.id,
        actorUserId: userId,
        conversationIds,
        action: action as InboxBulkOrganizationAction,
      });
      return NextResponse.json(result);
    }

    if (USER_STATE_ACTIONS.has(action as InboxBulkUserStateAction)) {
      await requireAnyPermission(INBOX_VIEW_PERMISSIONS);
      const result = await bulkApplyCommunicationCenterUserStateAction({
        tenantId: tenant.id,
        userId,
        conversationIds,
        action: action as InboxBulkUserStateAction,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) {
    if (error instanceof CommunicationCenterError) {
      const status =
        error.code === "FORBIDDEN"
          ? 403
          : error.code === "BULK_LIMIT" || error.code === "INVALID_INPUT"
            ? 400
            : 404;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    throw error;
  }
}
