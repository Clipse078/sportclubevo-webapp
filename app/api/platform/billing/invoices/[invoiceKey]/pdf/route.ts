import { NextRequest, NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { generateNativeInvoicePdfBytes } from "@/lib/billing/invoice-pdf-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ invoiceKey: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  try {
    const pdfBytes = await generateNativeInvoicePdfBytes(invoiceKey);
    const disposition =
      request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    const filename = `rechnung-${invoiceKey}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
