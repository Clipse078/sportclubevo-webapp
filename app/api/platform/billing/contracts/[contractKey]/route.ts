import { NextRequest, NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  getBillingContractDetail,
  updateBillingContract,
} from "@/lib/billing/native-billing-commercial-service";
import { serializeBillingContract } from "@/lib/billing/native-billing-commercial-serializers";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ contractKey: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { contractKey } = await context.params;
  try {
    const contract = await getBillingContractDetail(contractKey);
    return NextResponse.json({ contract: serializeBillingContract(contract) });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { contractKey } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const updated = await updateBillingContract({
      contractKey,
      productName: body.productName ? String(body.productName) : undefined,
      monthlyNetAmountMinor:
        body.monthlyNetAmountMinor != null
          ? Number(body.monthlyNetAmountMinor)
          : undefined,
      status: body.status ? (String(body.status) as "DRAFT" | "ACTIVE" | "PAUSED" | "TERMINATED") : undefined,
      endDate: body.endDate !== undefined ? (body.endDate ? String(body.endDate) : null) : undefined,
      paymentTermsDays:
        body.paymentTermsDays != null ? Number(body.paymentTermsDays) : undefined,
      invoiceRecipientProfileId:
        body.invoiceRecipientProfileId !== undefined
          ? body.invoiceRecipientProfileId
            ? String(body.invoiceRecipientProfileId)
            : null
          : undefined,
      description:
        body.description !== undefined
          ? body.description
            ? String(body.description)
            : null
          : undefined,
      internalNote:
        body.internalNote !== undefined
          ? body.internalNote
            ? String(body.internalNote)
            : null
          : undefined,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({ contract: serializeBillingContract(updated) });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
