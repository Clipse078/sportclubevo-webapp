import { NextResponse } from "next/server";
import { getBillingCommunicationOperationsSnapshot } from "@/lib/billing/billing-inbound/billing-inbound-operations-service";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

export const runtime = "nodejs";

export async function GET() {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const snapshot = await getBillingCommunicationOperationsSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
