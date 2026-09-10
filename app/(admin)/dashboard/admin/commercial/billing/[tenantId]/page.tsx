import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import PlatformBillingAccountCard from "@/components/admin/billing/PlatformBillingAccountCard";
import PlatformBillingDetailAlerts from "@/components/admin/billing/PlatformBillingDetailAlerts";
import PlatformBillingDetailSummary from "@/components/admin/billing/PlatformBillingDetailSummary";
import PlatformBillingInvoiceTable from "@/components/admin/billing/PlatformBillingInvoiceTable";
import PlatformBillingSubscriptionCard from "@/components/admin/billing/PlatformBillingSubscriptionCard";
import { EmptyState } from "@/components/ui/page";
import { getPlatformTenantBillingDetail } from "@/lib/billing/platform-billing-detail-service";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type PageProps = { params: Promise<{ tenantId: string }> };

export default async function PlatformCommercialBillingDetailPage({ params }: PageProps) {
  await requirePermission(PERMISSIONS.BILLING_VIEW);

  const { tenantId } = await params;
  const detail = await getPlatformTenantBillingDetail(tenantId);

  if (detail.kind === "tenant_not_found") {
    notFound();
  }

  const backLink = (
    <Link
      href="/dashboard/admin/commercial/billing"
      className="inline-flex items-center gap-2 text-sm text-[var(--text-2)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Zurück zur Billing-Übersicht
    </Link>
  );

  if (detail.kind === "no_billing_linkage") {
    return (
      <div className="space-y-8">
        {backLink}
        <AdminSectionHeader
          eyebrow="Commercial · Billing"
          title={detail.tenant.tenantName}
          description="Abonnement, Rechnungen und Zahlungsstatus dieses Clubs."
        />
        <EmptyState
          heading="Für diesen Club ist noch kein Billing-Konto verknüpft."
          description="Sobald ein Stripe-Kunde mit diesem Tenant verknüpft ist, erscheinen hier Abonnement- und Rechnungsdaten."
        />
      </div>
    );
  }

  if (detail.kind === "invalid_linkage") {
    return (
      <div className="space-y-8">
        {backLink}
        <AdminSectionHeader
          eyebrow="Commercial · Billing"
          title={detail.tenant.tenantName}
          description="Abonnement, Rechnungen und Zahlungsstatus dieses Clubs."
        />
        <div className="rounded-[var(--radius-lg)] border border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] px-4 py-3 text-sm text-[var(--sce-warning)]">
          {detail.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {backLink}
      <AdminSectionHeader
        eyebrow="Commercial · Billing"
        title={detail.tenant.tenantName}
        description="Abonnement, Rechnungen und Zahlungsstatus dieses Clubs."
      />

      <PlatformBillingDetailAlerts
        stripeState={detail.stripeState}
        degradedMessage={detail.degradedMessage}
      />

      <PlatformBillingDetailSummary tenant={detail.tenant} summary={detail.summary} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PlatformBillingSubscriptionCard subscription={detail.subscription} />
        <PlatformBillingAccountCard
          tenant={detail.tenant}
          billingAccount={detail.billingAccount}
        />
      </div>

      <PlatformBillingInvoiceTable
        invoices={detail.invoices}
        loadFailed={detail.invoicesLoadFailed}
      />
    </div>
  );
}
