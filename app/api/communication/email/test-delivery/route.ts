import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  PlatformEmailTestDeliveryError,
  sendPlatformEmailTestDelivery,
} from "@/lib/communication/platform-email/platform-email-test-delivery-service";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    await requireAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { testRecipientEmail?: unknown };

  try {
    const result = await sendPlatformEmailTestDelivery({
      tenantId: tenant.id,
      actorUserId: session.user.id,
      testRecipientEmail: body.testRecipientEmail,
    });
    return NextResponse.json({ ok: true, providerMessageId: result.providerMessageId });
  } catch (error) {
    if (error instanceof PlatformEmailTestDeliveryError) {
      const status =
        error.code === "NOT_READY" || error.code === "FORBIDDEN_RECIPIENT" ? 400 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    throw error;
  }
}
