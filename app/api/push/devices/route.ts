import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PushDevicePlatform } from "@prisma/client";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { getNotificationRecipientContext } from "@/lib/notifications/server-context";
import {
  listPushDevicesForUser,
  registerPushDevice,
} from "@/lib/push/push-device-registration-service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await requireApiSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const devices = await listPushDevicesForUser(session.session.user.id);
  return NextResponse.json({ devices });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await requireApiSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const ctx = await getNotificationRecipientContext();
  const body = (await request.json()) as {
    installationId?: string;
    platform?: string;
    subscription?: unknown;
  };

  const installationId = body.installationId?.trim();
  if (!installationId) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (body.platform !== PushDevicePlatform.WEB) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  if (!body.subscription || typeof body.subscription !== "object") {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  try {
    const device = await registerPushDevice(
      {
        userId: session.session.user.id,
        installationId,
        platform: PushDevicePlatform.WEB,
        subscriptionJson: JSON.stringify(body.subscription),
      },
      {
        tenantId: ctx?.tenantId ?? null,
        actorUserId: session.session.user.id,
      },
    );
    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    if (message === "INSTALLATION_ID_REQUIRED" || message === "SUBSCRIPTION_REQUIRED") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
