import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import type { BillingOperationsSummaryMetrics } from "@/lib/billing/operations/billing-operations-types";
import { AlertCircle, FileText, HandCoins, Users } from "lucide-react";

type Props = {
  metrics: BillingOperationsSummaryMetrics;
};

export default function BillingOperationsKpiStrip({ metrics }: Props) {
  const chf = metrics.chf;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        label="Aktive Kunden"
        value={String(metrics.activeCustomerCount)}
        subtext={`${metrics.activeContractCount} aktive Verträge`}
        accent="blue"
        icon={<Users className="h-5 w-5" />}
      />
      <KpiCard
        label="Offene Forderungen"
        value={formatBillingMoney(chf.openReceivablesMinor, chf.currency)}
        subtext={`${metrics.openInvoiceCount} offene Rechnungen`}
        accent="orange"
        icon={<FileText className="h-5 w-5" />}
      />
      <KpiCard
        label="Überfällig"
        value={formatBillingMoney(chf.overdueReceivablesMinor, chf.currency)}
        subtext={`${metrics.overdueInvoiceCount} Rechnungen`}
        accent="purple"
        icon={<AlertCircle className="h-5 w-5" />}
      />
      <KpiCard
        label="Bezahlt (Monat)"
        value={formatBillingMoney(chf.paidThisMonthMinor, chf.currency)}
        subtext="Bestätigte Zahlungen"
        accent="green"
        icon={<HandCoins className="h-5 w-5" />}
      />
      <KpiCard
        label="Aufmerksamkeit"
        value={String(metrics.attentionInvoiceCount)}
        subtext="Priorisierte Aufgaben"
        accent="tenant"
        icon={<AlertCircle className="h-5 w-5" />}
      />
    </div>
  );
}
