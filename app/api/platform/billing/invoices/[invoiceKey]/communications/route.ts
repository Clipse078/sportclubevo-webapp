import { NextRequest, NextResponse } from "next/server";
import { getInvoiceBillingCommunicationTimeline } from "@/lib/billing/billing-communication/billing-communication-service";
import { sendInvoiceBillingCommunication } from "@/lib/billing/billing-communication/billing-communication-send-service";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ invoiceKey: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  try {
    const communications = await getInvoiceBillingCommunicationTimeline(invoiceKey);
    return NextResponse.json({ communications });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  try {
    const result = await sendInvoiceBillingCommunication(invoiceKey, body);
    return NextResponse.json(result);
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
