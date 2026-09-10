import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import PlatformBillingAlerts from "@/components/admin/billing/PlatformBillingAlerts";
import PlatformBillingKpiStrip from "@/components/admin/billing/PlatformBillingKpiStrip";
import PlatformBillingOverviewTable from "@/components/admin/billing/PlatformBillingOverviewTable";
import { EmptyState } from "@/components/ui/page";
import { getPlatformBillingOverview } from "@/lib/billing/platform-billing-overview-service";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function PlatformCommercialBillingPage() {
  await requirePermission(PERMISSIONS.BILLING_VIEW);

  const overview = await getPlatformBillingOverview();

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title="Billing"
        description="Stripe-Abonnements, Rechnungen und Zahlungseingänge der SportClubEvo-Kunden."
      />

      <PlatformBillingAlerts stripeState={overview.stripeState} />

      {overview.linkedTenantCount === 0 ? (
        <EmptyState
          heading="Noch keine Billing-Kunden verknüpft"
          description="Stripe-Kunden können in der Plattform-Billing-Konfiguration mit Tenants verknüpft werden. Sobald Verknüpfungen bestehen, erscheinen sie hier."
        />
      ) : (
        <>
          <PlatformBillingKpiStrip kpis={overview.kpis} />
          <PlatformBillingOverviewTable rows={overview.rows} />
        </>
      )}
    </div>
  );
}
