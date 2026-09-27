import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { evaluatePlatformEmailReadiness } from "@/lib/communication/platform-email/email-readiness-service";
import { getTenantEmailSenderSettings } from "@/lib/communication/email-sender-service";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export async function GET() {
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

  const [readiness, sender] = await Promise.all([
    evaluatePlatformEmailReadiness(tenant.id),
    getTenantEmailSenderSettings(tenant.id),
  ]);

  return NextResponse.json({
    readiness,
    sender: {
      displayName: sender.displayName,
      emailAddress: sender.emailAddress,
      activeSource: sender.activeSource,
      activeFrom: sender.activeFrom,
      providerStatus: sender.providerStatus,
      platformFallbackActive: sender.platformFallbackActive,
    },
  });
}
