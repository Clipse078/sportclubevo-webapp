import type { ReactNode } from "react";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import { formatBillingDate } from "@/lib/billing/format-billing-date";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import { presentSubscriptionStatus } from "@/lib/billing/billing-status-presentation";
import type { PlatformBillingDetailSummary } from "@/lib/billing/platform-billing-detail-service";
import type { PlatformBillingTenantInfo } from "@/lib/billing/platform-billing-detail-service";

type PlatformBillingDetailSummaryProps = {
  tenant: PlatformBillingTenantInfo;
  summary: PlatformBillingDetailSummary | null;
};

function SummaryField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className="text-sm text-[var(--foreground)]">{children}</dd>
    </div>
  );
}

export default function PlatformBillingDetailSummary({
  tenant,
  summary,
}: PlatformBillingDetailSummaryProps) {
  const currency = summary?.currency ?? "chf";
  const subPresentation = presentSubscriptionStatus(summary?.subscriptionStatus);

  return (
    <section className="sce-card p-5" aria-labelledby="billing-summary-heading">
      <h3
        id="billing-summary-heading"
        className="text-sm font-semibold text-[var(--foreground)]"
      >
        Billing-Übersicht
      </h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryField label="Club">
          <span className="font-medium">{tenant.tenantName}</span>
          <span className="mt-0.5 block text-xs text-[var(--muted)]">{tenant.tenantKey}</span>
        </SummaryField>
        <SummaryField label="Aktueller Plan">
          {summary?.planName ?? "—"}
        </SummaryField>
        <SummaryField label="Abonnementstatus">
          {summary?.subscriptionStatus ? (
            <BillingStatusBadge
              label={subPresentation.label}
              tone={subPresentation.tone}
            />
          ) : (
            <BillingStatusBadge label="Kein Abo" tone="muted" />
          )}
        </SummaryField>
        <SummaryField label="Monatswert">
          {summary && summary.monthlyRecurringMinorUnits > 0
            ? formatBillingMoney(summary.monthlyRecurringMinorUnits, currency)
            : "—"}
        </SummaryField>
        <SummaryField label="Offener Betrag">
          {summary && summary.outstandingAmount > 0
            ? formatBillingMoney(summary.outstandingAmount, currency)
            : "—"}
        </SummaryField>
        <SummaryField label="Überfällige Rechnungen">
          {summary ? String(summary.overdueInvoiceCount) : "—"}
        </SummaryField>
        <SummaryField label="Nächste Abrechnung">
          {formatBillingDate(summary?.nextBillingDate)}
        </SummaryField>
      </dl>
    </section>
  );
}
