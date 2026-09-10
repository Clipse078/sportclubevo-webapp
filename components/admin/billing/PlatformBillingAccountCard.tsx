import { formatBillingDate } from "@/lib/billing/format-billing-date";
import type {
  PlatformBillingAccountInfo,
  PlatformBillingTenantInfo,
} from "@/lib/billing/platform-billing-detail-service";

type PlatformBillingAccountCardProps = {
  tenant: PlatformBillingTenantInfo;
  billingAccount: PlatformBillingAccountInfo;
};

export default function PlatformBillingAccountCard({
  tenant,
  billingAccount,
}: PlatformBillingAccountCardProps) {
  const linkageLabel =
    billingAccount.linkageStatus === "linked" ? "Verknüpft" : "Ungültig";

  return (
    <section className="sce-card p-5" aria-labelledby="billing-account-heading">
      <h3
        id="billing-account-heading"
        className="text-sm font-semibold text-[var(--foreground)]"
      >
        Billing-Konto
      </h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[var(--muted)]">Club</dt>
          <dd className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
            {tenant.tenantName}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Stripe-Verknüpfung</dt>
          <dd className="mt-0.5 text-sm text-[var(--foreground)]">{linkageLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Kundenstatus</dt>
          <dd className="mt-0.5 text-sm text-[var(--foreground)]">
            {billingAccount.linkageStatus === "linked" ? "Aktiv verknüpft" : "Ungültig"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Währung</dt>
          <dd className="mt-0.5 text-sm text-[var(--foreground)]">
            {billingAccount.currency?.toUpperCase() ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Verknüpft am</dt>
          <dd className="mt-0.5 text-sm text-[var(--foreground)]">
            {formatBillingDate(billingAccount.linkedAt)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
