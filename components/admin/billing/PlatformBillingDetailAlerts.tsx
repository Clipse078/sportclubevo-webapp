import type { PlatformBillingStripeState } from "@/lib/billing/platform-billing-overview-service";

type PlatformBillingDetailAlertsProps = {
  stripeState: PlatformBillingStripeState;
  degradedMessage: string | null;
};

export default function PlatformBillingDetailAlerts({
  stripeState,
  degradedMessage,
}: PlatformBillingDetailAlertsProps) {
  const alerts: string[] = [];

  if (stripeState.kind !== "ready") {
    alerts.push(stripeState.message);
  }
  if (degradedMessage) {
    alerts.push(degradedMessage);
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {alerts.map((message) => (
        <div
          key={message}
          className="rounded-[var(--radius-lg)] border border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] px-4 py-3 text-sm text-[var(--sce-warning)]"
        >
          {message}
        </div>
      ))}
    </div>
  );
}
