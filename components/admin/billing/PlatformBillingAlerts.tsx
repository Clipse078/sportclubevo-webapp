import type { PlatformBillingStripeState } from "@/lib/billing/platform-billing-overview-service";

type PlatformBillingAlertsProps = {
  stripeState: PlatformBillingStripeState;
};

export default function PlatformBillingAlerts({ stripeState }: PlatformBillingAlertsProps) {
  if (stripeState.kind === "ready") {
    return null;
  }

  const tone =
    stripeState.kind === "not_configured"
      ? "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)]"
      : "border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] text-[var(--sce-warning)]";

  return (
    <div className={`rounded-[var(--radius-lg)] border px-4 py-3 text-sm ${tone}`}>
      {stripeState.message}
    </div>
  );
}
