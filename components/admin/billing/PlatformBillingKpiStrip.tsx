import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { formatBillingMoneyMultiCurrency } from "@/lib/billing/format-billing-money";
import type { PlatformBillingKpis } from "@/lib/billing/billing-kpi";
import { CreditCard, Users, AlertCircle, Clock } from "lucide-react";

type PlatformBillingKpiStripProps = {
  kpis: PlatformBillingKpis;
};

export default function PlatformBillingKpiStrip({ kpis }: PlatformBillingKpiStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="MRR"
        value={formatBillingMoneyMultiCurrency(kpis.mrrByCurrency)}
        subtext="Aktive Abonnements (exkl. MwSt.)"
        accent="blue"
        icon={<CreditCard className="h-5 w-5" />}
      />
      <KpiCard
        label="Aktive Kunden"
        value={String(kpis.activeCustomerCount)}
        subtext="Tenants mit aktivem Abo"
        accent="green"
        icon={<Users className="h-5 w-5" />}
      />
      <KpiCard
        label="Offen"
        value={formatBillingMoneyMultiCurrency(kpis.outstandingByCurrency)}
        subtext="Offene Rechnungen"
        accent="orange"
        icon={<Clock className="h-5 w-5" />}
      />
      <KpiCard
        label="Überfällig"
        value={String(kpis.overdueInvoiceCount)}
        subtext="Offene Rechnungen nach Fälligkeit"
        accent="purple"
        icon={<AlertCircle className="h-5 w-5" />}
      />
    </div>
  );
}
