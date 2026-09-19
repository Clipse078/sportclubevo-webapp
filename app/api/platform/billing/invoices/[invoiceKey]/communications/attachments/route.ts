import { NextRequest, NextResponse } from "next/server";
import { findInvoiceByKey } from "@/lib/billing/native-billing-commercial-repository";
import {
  assertTenantMatchesBillingCustomer,
  resolveTenantIdForBillingCustomer,
} from "@/lib/billing/billing-communication/billing-communication-tenant";
import {
  BillingCommunicationAttachmentServiceError,
  serializeBillingCommunicationAttachment,
  stageOutboundBillingCommunicationAttachment,
} from "@/lib/billing/billing-communication/billing-communication-attachment-service";
import {
  BillingCommunicationAttachmentValidationError,
  MAX_BILLING_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
} from "@/lib/billing/billing-communication/billing-communication-attachment-policy";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ invoiceKey: string }> };

function uploadErrorResponse(error: unknown) {
  if (error instanceof BillingCommunicationAttachmentValidationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "FILE_TOO_LARGE" ? 413 : 400 },
    );
  }
  if (error instanceof BillingCommunicationAttachmentServiceError) {
    const status =
      error.code === "STORAGE_FAILED" || error.code === "PERSISTENCE_FAILED" ? 502 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return nativeBillingErrorResponse(error);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }
  if (invoice.status === "DRAFT") {
    return NextResponse.json(
      { error: "Für Entwurfsrechnungen sind noch keine Anhänge möglich." },
      { status: 400 },
    );
  }

  const tenantId = await resolveTenantIdForBillingCustomer(invoice.billingCustomerId);
  await assertTenantMatchesBillingCustomer(tenantId, invoice.billingCustomerId);

  try {
    const formData = await request.formData();
    const files = formData.getAll("file");
    if (files.length !== 1 || !(files[0] instanceof File)) {
      return NextResponse.json(
        { error: "Bitte genau eine Datei auswählen." },
        { status: 400 },
      );
    }
    const file = files[0];
    if (file.size > MAX_BILLING_COMMUNICATION_ATTACHMENT_SIZE_BYTES) {
      return NextResponse.json({ error: "Die Datei überschreitet 10 MiB." }, { status: 413 });
    }

    const attachment = await stageOutboundBillingCommunicationAttachment({
      tenantId,
      invoiceId: invoice.id,
      filename: file.name,
      declaredContentType: file.type || "application/octet-stream",
      buffer: new Uint8Array(await file.arrayBuffer()),
    });

    return NextResponse.json({
      attachment: serializeBillingCommunicationAttachment({ attachment, invoiceKey }),
    });
  } catch (error) {
    return uploadErrorResponse(error);
  }
}
