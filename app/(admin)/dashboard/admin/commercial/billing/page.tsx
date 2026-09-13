import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import BillingOperationsActivityFeed from "@/components/admin/billing/BillingOperationsActivityFeed";
import BillingOperationsAttentionQueue from "@/components/admin/billing/BillingOperationsAttentionQueue";
import BillingOperationsKpiStrip from "@/components/admin/billing/BillingOperationsKpiStrip";
import BillingOperationsReconciliationSummary from "@/components/admin/billing/BillingOperationsReconciliationSummary";
import { getBillingOperationsDashboard } from "@/lib/billing/operations/billing-operations-service";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function PlatformCommercialBillingPage() {
  await requirePermission(PERMISSIONS.BILLING_VIEW);

  let dashboard: Awaited<ReturnType<typeof getBillingOperationsDashboard>> | null = null;
  try {
    dashboard = await getBillingOperationsDashboard();
  } catch {
    dashboard = null;
  }

  if (!dashboard) {
    return (
      <div className="space-y-8">
        <AdminSectionHeader
          eyebrow="Commercial"
          title="Abrechnung"
          description="SCE Billing — Kunden, Verträge, Rechnungen, Zahlungen und Bankabgleich."
        />
        <p className="text-sm text-destructive">
          Abrechnungsübersicht konnte nicht geladen werden. Bitte später erneut versuchen.
        </p>
      </div>
    );
  }

  const quickLinks = [
    { href: "/dashboard/admin/commercial/billing/invoices", label: "Rechnungen" },
    { href: "/dashboard/admin/commercial/billing/customers", label: "Kunden" },
    { href: "/dashboard/admin/commercial/billing/contracts", label: "Verträge" },
    { href: "/dashboard/admin/commercial/billing/reconciliation", label: "Bankabgleich" },
  ];

  return (
    <div className="space-y-10">
      <AdminSectionHeader
        eyebrow="Commercial"
        title="Abrechnung"
        description="Operative Übersicht über SCE Billing: Forderungen, Aufgaben, Aktivitäten und Bankabgleich."
      />

      <BillingOperationsKpiStrip metrics={dashboard.metrics} />

      <nav className="flex flex-wrap gap-4 text-sm">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="text-primary hover:underline">
            {link.label} →
          </Link>
        ))}
      </nav>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-base font-semibold">Aufmerksamkeit erforderlich</h2>
            <span className="text-xs text-muted-foreground">{dashboard.attention.length} Punkte</span>
          </div>
          <BillingOperationsAttentionQueue items={dashboard.attention} />
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold">Bankabgleich</h2>
          <BillingOperationsReconciliationSummary summary={dashboard.reconciliation} />
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Letzte Aktivitäten</h2>
        <BillingOperationsActivityFeed items={dashboard.activity} />
      </section>
    </div>
  );
}
