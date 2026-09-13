import BillingMetricTile from "@/components/admin/billing/shell/BillingMetricTile";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import type { BillingOperationsSummaryMetrics } from "@/lib/billing/operations/billing-operations-types";
import { AlertCircle, FileText, HandCoins, Users } from "lucide-react";

type Props = {
  metrics: BillingOperationsSummaryMetrics;
};

export default function BillingOperationsKpiStrip({ metrics }: Props) {
  const chf = metrics.chf;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <BillingMetricTile
        label="Aktive Kunden"
        value={String(metrics.activeCustomerCount)}
        hint={`${metrics.activeContractCount} aktive Verträge`}
        icon={<Users className="h-5 w-5" strokeWidth={1.75} />}
      />
      <BillingMetricTile
        label="Offene Forderungen"
        value={formatBillingMoney(chf.openReceivablesMinor, chf.currency)}
        hint={`${metrics.openInvoiceCount} offene Rechnungen`}
        icon={<FileText className="h-5 w-5" strokeWidth={1.75} />}
      />
      <BillingMetricTile
        label="Überfällig"
        value={formatBillingMoney(chf.overdueReceivablesMinor, chf.currency)}
        hint={`${metrics.overdueInvoiceCount} Rechnungen`}
        icon={<AlertCircle className="h-5 w-5" strokeWidth={1.75} />}
      />
      <BillingMetricTile
        label="Bezahlt diesen Monat"
        value={formatBillingMoney(chf.paidThisMonthMinor, chf.currency)}
        hint="Bestätigte Zahlungen"
        icon={<HandCoins className="h-5 w-5" strokeWidth={1.75} />}
      />
    </div>
  );
}
