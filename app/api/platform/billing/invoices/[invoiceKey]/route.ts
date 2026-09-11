import { NextRequest, NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  getInvoiceDetail,
  updateDraftInvoice,
} from "@/lib/billing/native-billing-commercial-service";
import {
  serializeInvoice,
  serializeInvoiceLine,
  serializeInvoiceTaxSnapshot,
  serializeIssuerSnapshot,
  serializeRecipientSnapshot,
} from "@/lib/billing/native-billing-commercial-serializers";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ invoiceKey: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  try {
    const detail = await getInvoiceDetail(invoiceKey);
    return NextResponse.json({
      invoice: serializeInvoice(detail.invoice),
      lines: detail.lines.map(serializeInvoiceLine),
      taxSnapshots: detail.taxSnapshots.map(serializeInvoiceTaxSnapshot),
      issuer: detail.issuer ? serializeIssuerSnapshot(detail.issuer) : null,
      recipient: detail.recipient ? serializeRecipientSnapshot(detail.recipient) : null,
    });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const lines = Array.isArray(body.lines)
      ? (body.lines as Array<Record<string, unknown>>).map((line) => ({
          description: String(line.description ?? ""),
          quantity: Number(line.quantity ?? 1),
          unitPriceNetMinor: Number(line.unitPriceNetMinor ?? 0),
          vatRateBps: line.vatRateBps != null ? Number(line.vatRateBps) : undefined,
          sortOrder: line.sortOrder != null ? Number(line.sortOrder) : undefined,
        }))
      : undefined;

    const updated = await updateDraftInvoice({
      invoiceKey,
      periodStart: body.periodStart ? String(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? String(body.periodEnd) : undefined,
      invoiceDate:
        body.invoiceDate !== undefined
          ? body.invoiceDate
            ? String(body.invoiceDate)
            : null
          : undefined,
      lines,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({ invoice: serializeInvoice(updated) });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
