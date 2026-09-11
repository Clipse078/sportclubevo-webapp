import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import NativeBillingContractActions from "@/components/admin/billing/NativeBillingContractActions";
import { getBillingContractDetail } from "@/lib/billing/native-billing-commercial-service";
import { findBillingProductById } from "@/lib/billing/native-billing-commercial-repository";
import { findBillingCustomerById } from "@/lib/billing/native-billing-repository";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import {
  formatBillingDateDisplay,
  presentBillingContractStatus,
  presentBillingInterval,
  presentSwissVatTreatment,
} from "@/lib/billing/native-billing-presentation";
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
  const catalogueProduct = contract.billingProductId
    ? await findBillingProductById(contract.billingProductId)
    : null;
  const statusPresentation = presentBillingContractStatus(contract.status);
  const negotiatedFormatted = formatBillingMoney(
    contract.monthlyNetAmountMinor,
    contract.currency,
  );

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

      <div className="flex flex-wrap items-center gap-3">
        <BillingStatusBadge
          label={statusPresentation.label}
          tone={statusPresentation.tone}
        />
        <NativeBillingContractActions
          contractKey={contract.key}
          status={contract.status}
          canManage={canManage}
        />
      </div>

      <section className="rounded-lg border border-border bg-muted/10 p-4 max-w-xl space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Vereinbarter Monatspreis</p>
        <p className="text-2xl font-semibold tabular-nums">{negotiatedFormatted}</p>
        <p className="text-sm text-muted-foreground">
          netto · {presentBillingInterval(contract.billingInterval)} ·{" "}
          {presentSwissVatTreatment(contract.vatTreatment)}
        </p>
        {catalogueProduct?.catalogueMonthlyNetMinor != null ? (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            Katalogpreis (Referenz, nicht Vertragspreis): ab{" "}
            {formatBillingMoney(catalogueProduct.catalogueMonthlyNetMinor, contract.currency)}
          </p>
        ) : null}
      </section>

      <dl className="grid gap-4 sm:grid-cols-2 max-w-3xl text-sm">
        <div>
          <dt className="text-muted-foreground">Kunde</dt>
          <dd className="font-medium">{customer?.displayName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Produkt</dt>
          <dd className="font-medium">{contract.productName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Vertragsbeginn</dt>
          <dd>{formatBillingDateDisplay(contract.startDate)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Vertragsende</dt>
          <dd>{formatBillingDateDisplay(contract.endDate)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Zahlungsziel</dt>
          <dd>{contract.paymentTermsDays} Tage</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Abrechnungsintervall</dt>
          <dd>{presentBillingInterval(contract.billingInterval)}</dd>
        </div>
      </dl>
    </div>
  );
}
