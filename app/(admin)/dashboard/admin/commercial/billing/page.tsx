import Link from "next/link";
import BillingPageHeader from "@/components/admin/billing/shell/BillingPageHeader";
import BillingOperationsActivityFeed from "@/components/admin/billing/BillingOperationsActivityFeed";
import BillingOperationsAttentionQueue from "@/components/admin/billing/BillingOperationsAttentionQueue";
import BillingOperationsKpiStrip from "@/components/admin/billing/BillingOperationsKpiStrip";
import BillingOperationsReconciliationSummary from "@/components/admin/billing/BillingOperationsReconciliationSummary";
import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
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
      <div className="space-y-6">
        <BillingPageHeader
          title="Abrechnung"
          description="Finanzielle Übersicht und offene Aufgaben."
        />
        <p className="text-sm text-destructive">
          Abrechnungsübersicht konnte nicht geladen werden. Bitte später erneut versuchen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <BillingPageHeader
        title="Abrechnung"
        description="Finanzielle Übersicht und offene Aufgaben."
      />

      <BillingOperationsKpiStrip metrics={dashboard.metrics} />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Aufmerksamkeit erforderlich
          </h2>
          <span className="text-xs text-[var(--muted)]">{dashboard.attention.length} Punkte</span>
        </div>
        <BillingOperationsAttentionQueue items={dashboard.attention} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Letzte Aktivitäten
          </h2>
          <BillingPanel>
            <BillingOperationsActivityFeed items={dashboard.activity} />
          </BillingPanel>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Bankabgleich
          </h2>
          <BillingOperationsReconciliationSummary summary={dashboard.reconciliation} />
        </section>
      </div>
    </div>
  );
}
