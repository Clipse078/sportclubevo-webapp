import { NextRequest, NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  createBillingContract,
  getBillingContractsOverview,
  getBillingProductsCatalogue,
} from "@/lib/billing/native-billing-commercial-service";
import {
  serializeBillingContract,
  serializeBillingProduct,
} from "@/lib/billing/native-billing-commercial-serializers";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

export async function GET() {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [contracts, products] = await Promise.all([
    getBillingContractsOverview(),
    getBillingProductsCatalogue(),
  ]);

  return NextResponse.json({
    contracts: contracts.map(serializeBillingContract),
    products: products.map(serializeBillingProduct),
  });
}

export async function POST(request: NextRequest) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await request.json()) as Record<string, unknown>;
  try {
    const created = await createBillingContract({
      legalEntityId: String(body.legalEntityId ?? ""),
      billingCustomerId: String(body.billingCustomerId ?? ""),
      contractNumber: String(body.contractNumber ?? ""),
      billingProductId: body.billingProductId ? String(body.billingProductId) : null,
      productName: body.productName ? String(body.productName) : undefined,
      monthlyNetAmountMinor: Number(body.monthlyNetAmountMinor ?? 0),
      currency: body.currency ? String(body.currency) : undefined,
      startDate: String(body.startDate ?? ""),
      endDate: body.endDate ? String(body.endDate) : null,
      minimumTermMonths:
        body.minimumTermMonths != null ? Number(body.minimumTermMonths) : null,
      paymentTermsDays:
        body.paymentTermsDays != null ? Number(body.paymentTermsDays) : undefined,
      invoiceRecipientProfileId: body.invoiceRecipientProfileId
        ? String(body.invoiceRecipientProfileId)
        : null,
      description: body.description ? String(body.description) : null,
      internalNote: body.internalNote ? String(body.internalNote) : null,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json(
      { contract: serializeBillingContract(created) },
      { status: 201 },
    );
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
