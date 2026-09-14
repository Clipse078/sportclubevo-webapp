import { NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { assertBillingTestDeliveryAllowed } from "@/lib/billing/invoice-delivery/billing-test-delivery-guards";
import { executeBillingInvoiceTestDelivery } from "@/lib/billing/invoice-delivery/billing-test-delivery-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";
import { prisma } from "@/lib/db/prisma";
import { isPlatformSuperAdmin } from "@/lib/security/platform-superadmin";

type RouteContext = { params: Promise<{ invoiceKey: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!(await isPlatformSuperAdmin(prisma, access.actorUserId!))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    assertBillingTestDeliveryAllowed();
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }

  const { invoiceKey } = await context.params;

  try {
    const result = await executeBillingInvoiceTestDelivery({
      invoiceKey,
      actorUserId: access.actorUserId!,
    });

    return NextResponse.json({
      testDelivery: {
        kind: result.kind,
        invoiceKey: result.invoiceKey,
        invoiceNumber: result.invoiceNumber,
        recipientEmail: result.recipientEmail,
        provider: result.provider,
        messageId: result.messageId,
        from: result.from,
        replyTo: result.replyTo,
        attachmentFilename: result.attachmentFilename,
        subject: result.subject,
      },
    });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
