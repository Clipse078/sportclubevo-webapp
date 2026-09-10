import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import { formatBillingDate } from "@/lib/billing/format-billing-date";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import { presentSubscriptionStatus } from "@/lib/billing/billing-status-presentation";
import type { PlatformBillingDetailSubscription } from "@/lib/billing/platform-billing-detail-service";

type PlatformBillingSubscriptionCardProps = {
  subscription: PlatformBillingDetailSubscription | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function formatInterval(
  interval: string | null,
  intervalCount: number | null,
): string {
  if (!interval) return "—";
  const count = intervalCount ?? 1;
  const labels: Record<string, string> = {
    month: count === 1 ? "Monatlich" : `Alle ${count} Monate`,
    year: count === 1 ? "Jährlich" : `Alle ${count} Jahre`,
    week: count === 1 ? "Wöchentlich" : `Alle ${count} Wochen`,
    day: count === 1 ? "Täglich" : `Alle ${count} Tage`,
  };
  return labels[interval] ?? interval;
}

export default function PlatformBillingSubscriptionCard({
  subscription,
}: PlatformBillingSubscriptionCardProps) {
  return (
    <section className="sce-card p-5" aria-labelledby="billing-subscription-heading">
      <h3
        id="billing-subscription-heading"
        className="text-sm font-semibold text-[var(--foreground)]"
      >
        Abonnement
      </h3>

      {!subscription ? (
        <p className="mt-3 text-sm text-[var(--text-2)]">
          Kein aktives Abonnement vorhanden.
        </p>
      ) : (
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Plan" value={subscription.planName ?? "—"} />
          <div>
            <dt className="text-xs text-[var(--muted)]">Status</dt>
            <dd className="mt-1">
              <BillingStatusBadge
                label={presentSubscriptionStatus(subscription.status).label}
                tone={presentSubscriptionStatus(subscription.status).tone}
              />
            </dd>
          </div>
          <Field
            label="Intervall"
            value={formatInterval(subscription.interval, subscription.intervalCount)}
          />
          <Field
            label="Betrag"
            value={
              subscription.unitAmount != null && subscription.currency
                ? formatBillingMoney(subscription.unitAmount, subscription.currency)
                : "—"
            }
          />
          <Field
            label="Währung"
            value={subscription.currency?.toUpperCase() ?? "—"}
          />
          <Field
            label="Aktuelle Periode"
            value={`${formatBillingDate(subscription.currentPeriodStart)} – ${formatBillingDate(subscription.currentPeriodEnd)}`}
          />
          <Field
            label="Kündigung zum Periodenende"
            value={subscription.cancelAtPeriodEnd ? "Ja" : "Nein"}
          />
          {subscription.trialEnd ? (
            <Field label="Testphase endet" value={formatBillingDate(subscription.trialEnd)} />
          ) : null}
        </dl>
      )}
    </section>
  );
}
