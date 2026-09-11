import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingContractActions from "@/components/admin/billing/NativeBillingContractActions";
import { getBillingContractDetail } from "@/lib/billing/native-billing-commercial-service";
import { findBillingCustomerById } from "@/lib/billing/native-billing-repository";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type PageProps = { params: Promise<{ contractKey: string }> };

export default async function NativeBillingContractDetailPage({ params }: PageProps) {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);
  const { contractKey } = await params;

  let contract: Awaited<ReturnType<typeof getBillingContractDetail>> | null = null;
  try {
    contract = await getBillingContractDetail(contractKey);
  } catch {
    contract = null;
  }

  if (!contract) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Vertrag nicht gefunden.</p>
        <Link href="/dashboard/admin/commercial/billing/contracts" className="fca-button-secondary">
          Zurück
        </Link>
      </div>
    );
  }

  const customer = await findBillingCustomerById(contract.billingCustomerId);

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title={contract.contractNumber}
        description={contract.productName}
        actions={
          <Link href="/dashboard/admin/commercial/billing/contracts" className="fca-button-secondary">
            Zurück
          </Link>
        }
      />

      <NativeBillingContractActions
        contractKey={contract.key}
        status={contract.status}
        canManage={canManage}
      />

      <dl className="grid gap-4 sm:grid-cols-2 max-w-3xl text-sm">
        <div>
          <dt className="text-muted-foreground">Kunde</dt>
          <dd className="font-medium">{customer?.displayName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium">{contract.status}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Netto / Monat</dt>
          <dd className="font-medium tabular-nums">
            {formatBillingMoney(contract.monthlyNetAmountMinor, contract.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">MWST</dt>
          <dd className="font-medium">{contract.vatTreatment}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Start</dt>
          <dd>{contract.startDate.toISOString().slice(0, 10)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Zahlungsziel</dt>
          <dd>{contract.paymentTermsDays} Tage</dd>
        </div>
      </dl>
    </div>
  );
}
