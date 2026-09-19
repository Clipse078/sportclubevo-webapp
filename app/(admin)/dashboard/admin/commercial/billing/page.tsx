import BillingPageHeader from "@/components/admin/billing/shell/BillingPageHeader";
import BillingWorkspaceContent from "@/components/admin/billing/shell/BillingWorkspaceContent";
import BillingOperationsActivityFeed from "@/components/admin/billing/BillingOperationsActivityFeed";
import BillingOperationsAttentionQueue from "@/components/admin/billing/BillingOperationsAttentionQueue";
import BillingOperationsKpiStrip from "@/components/admin/billing/BillingOperationsKpiStrip";
import BillingOperationsReconciliationSummary from "@/components/admin/billing/BillingOperationsReconciliationSummary";
import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
import { countBillingInboundUnresolvedMessages } from "@/lib/billing/billing-inbound/billing-inbound-mailbox-repository";
import { getBillingOperationsDashboard } from "@/lib/billing/operations/billing-operations-service";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function PlatformCommercialBillingPage() {
  await requirePermission(PERMISSIONS.BILLING_VIEW);

  let dashboard: Awaited<ReturnType<typeof getBillingOperationsDashboard>> | null = null;
  let unresolvedInboundCount = 0;
  try {
    const [loadedDashboard, unresolvedCount] = await Promise.all([
      getBillingOperationsDashboard(),
      countBillingInboundUnresolvedMessages(),
    ]);
    dashboard = loadedDashboard;
    unresolvedInboundCount = unresolvedCount;
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
    <BillingWorkspaceContent width="list">
    <div className="space-y-8">
      <BillingPageHeader
        title="Abrechnung"
        description="Finanzielle Übersicht und offene Aufgaben."
      />

      <BillingOperationsKpiStrip metrics={dashboard.metrics} />

      {unresolvedInboundCount > 0 ? (
        <p className="rounded-md bg-[color-mix(in_srgb,var(--muted)_12%,transparent)] px-4 py-3 text-sm text-[var(--text-2)] ring-1 ring-[color-mix(in_srgb,var(--border)_45%,transparent)]">
          Nicht zugeordnete Nachrichten: {unresolvedInboundCount}
        </p>
      ) : null}

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
    </BillingWorkspaceContent>
  );
}
