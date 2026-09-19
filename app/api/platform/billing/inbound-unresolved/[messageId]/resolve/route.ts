import { NextResponse } from "next/server";
import { resolveBillingInboundUnresolvedMessage } from "@/lib/billing/billing-inbound/billing-inbound-unresolved-resolution-service";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  invoiceKey: z.string().trim().min(1),
});

type RouteContext = {
  params: Promise<{ messageId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { messageId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  try {
    const result = await resolveBillingInboundUnresolvedMessage({
      unresolvedMessageId: messageId,
      invoiceKey: parsed.data.invoiceKey,
    });
    return NextResponse.json(result);
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
