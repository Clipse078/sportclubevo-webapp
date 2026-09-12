import { NextResponse } from "next/server";
import { buildBillingEmailIdentityReport } from "@/lib/billing/invoice-delivery/billing-email-identity-report";
import { shouldUseBillingDeliveryDryRunTransport } from "@/lib/billing/invoice-delivery/billing-delivery-transport-mode";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

export async function GET() {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const identity = await buildBillingEmailIdentityReport();
    return NextResponse.json({
      identity,
      deliveryDryRunTransport: shouldUseBillingDeliveryDryRunTransport(),
    });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
