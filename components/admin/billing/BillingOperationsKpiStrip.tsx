import BillingMetricTile from "@/components/admin/billing/shell/BillingMetricTile";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import type { BillingOperationsSummaryMetrics } from "@/lib/billing/operations/billing-operations-types";
import { AlertCircle, FileText } from "lucide-react";
import { SponsorSceIcon } from "@/components/icons/domain-sce-icon-components";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

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
        icon={<ProductDomainSceIcon name="commercial-account" size={20} />}
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
        icon={<SponsorSceIcon className="h-5 w-5" />}
      />
    </div>
  );
}
