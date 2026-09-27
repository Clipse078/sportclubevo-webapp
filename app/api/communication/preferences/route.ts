import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  listCommunicationPreferencesForUser,
  upsertUserCommunicationPreference,
} from "@/lib/communication/preferences/communication-preference-service";
import { getNotificationRecipientContext } from "@/lib/notifications/server-context";

export const dynamic = "force-dynamic";

const VALID_CHANNELS = new Set(["IN_APP", "PUSH", "EMAIL"]);
const VALID_STATES = new Set(["ENABLED", "DISABLED"]);

export async function GET(): Promise<NextResponse> {
  const ctx = await getNotificationRecipientContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await listCommunicationPreferencesForUser(ctx.tenantId, ctx.userId);
  return NextResponse.json({ preferences });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const ctx = await getNotificationRecipientContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    category?: string;
    channel?: string;
    explicitState?: string;
    userId?: string;
    tenantId?: string;
  };

  if (body.userId && body.userId !== ctx.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (body.tenantId && body.tenantId !== ctx.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!body.category || !body.channel || !body.explicitState) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (!VALID_CHANNELS.has(body.channel) || !VALID_STATES.has(body.explicitState)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const preference = await upsertUserCommunicationPreference({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      actorUserId: ctx.userId,
      category: body.category,
      channel: body.channel,
      explicitState: body.explicitState as "ENABLED" | "DISABLED",
    });
    return NextResponse.json({ preference });
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
