"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { formatBillingDate } from "@/lib/billing/format-billing-date";
import type { PlatformBillingDetailSubscription } from "@/lib/billing/platform-billing-detail-service";
import type { TenantLifecycleSnapshot } from "@/lib/tenants/tenant-lifecycle-types";
import {
  presentSceTenantAccessStatus,
  presentStripeSubscriptionAccessLine,
  presentSuspensionReason,
} from "@/lib/tenants/tenant-lifecycle-presentation";

type Props = {
  tenantKey: string;
  tenantName: string;
  lifecycle: TenantLifecycleSnapshot;
  subscription: PlatformBillingDetailSubscription | null;
  canManage: boolean;
};

type LifecycleApiResult = {
  stripeWarning?: string;
};

async function postLifecycle(
  path: string,
  body: Record<string, unknown>,
): Promise<{ error?: string; result?: LifecycleApiResult }> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: typeof data?.error === "string" ? data.error : "Aktion fehlgeschlagen." };
  }
  const result = data?.result;
  if (result && typeof result === "object" && result !== null) {
    return {
      result: {
        stripeWarning:
          typeof (result as { stripeWarning?: string }).stripeWarning === "string"
            ? (result as { stripeWarning: string }).stripeWarning
            : undefined,
      },
    };
  }
  return {};
}

export default function PlatformBillingLifecyclePanel({
  tenantKey,
  tenantName,
  lifecycle,
  subscription,
  canManage,
}: Props) {
  const router = useRouter();
  const basePath = `/api/platform/billing/tenants/${encodeURIComponent(tenantKey)}/lifecycle`;

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stripeWarning, setStripeWarning] = useState<string | null>(null);

  const [suspendReason, setSuspendReason] = useState<
    "NON_PAYMENT" | "ADMINISTRATIVE" | "OTHER"
  >("NON_PAYMENT");
  const [billingBehavior, setBillingBehavior] = useState<
    "KEEP_BILLING" | "SCHEDULE_CANCELLATION"
  >("KEEP_BILLING");
  const [undoCancel, setUndoCancel] = useState(
    Boolean(subscription?.cancelAtPeriodEnd && subscription.status !== "canceled"),
  );
  const [terminateReason, setTerminateReason] = useState<
    "CONTRACT_ENDED" | "CUSTOMER_REQUEST" | "ADMINISTRATIVE" | "OTHER"
  >("CONTRACT_ENDED");
  const [terminateConfirmed, setTerminateConfirmed] = useState(false);

  const stripeLine = presentStripeSubscriptionAccessLine({
    subscriptionStatus: subscription?.status ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    lifecycleStatus: lifecycle.status,
  });

  const subscriptionCanceled =
    subscription?.status?.toLowerCase() === "canceled";

  async function runAction(
    fn: () => Promise<{ error?: string; result?: LifecycleApiResult }>,
    close: () => void,
  ) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    setStripeWarning(null);
    const outcome = await fn();
    setBusy(false);
    if (outcome.error) {
      setError(outcome.error);
      return;
    }
    close();
    setSuccess("Änderung gespeichert.");
    if (outcome.result?.stripeWarning) {
      setStripeWarning(outcome.result.stripeWarning);
    }
    router.refresh();
  }

  const showSuspend = lifecycle.status === "ACTIVE" && canManage;
  const showReactivate = lifecycle.status === "SUSPENDED" && canManage;
  const showTerminate =
    (lifecycle.status === "ACTIVE" || lifecycle.status === "SUSPENDED") && canManage;

  return (
    <section className="sce-card p-5" aria-labelledby="billing-lifecycle-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3
            id="billing-lifecycle-heading"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            Vertrags- &amp; Zugriffsstatus
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            SCE-Zugang und Stripe-Abonnement sind getrennte Steuerungsebenen.
          </p>
        </div>
        {(showSuspend || showReactivate || showTerminate) && (
          <div className="flex flex-wrap gap-2">
            {showSuspend && (
              <Button variant="secondary" size="sm" onClick={() => setSuspendOpen(true)}>
                Tenant sperren
              </Button>
            )}
            {showReactivate && (
              <Button variant="secondary" size="sm" onClick={() => setReactivateOpen(true)}>
                Tenant reaktivieren
              </Button>
            )}
            {showTerminate && (
              <Button variant="danger" size="sm" onClick={() => setTerminateOpen(true)}>
                Vertrag beenden
              </Button>
            )}
          </div>
        )}
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[var(--muted)]">SCE-Zugang</dt>
          <dd className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
            {presentSceTenantAccessStatus(lifecycle.status)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Stripe-Abonnement</dt>
          <dd className="mt-0.5 text-sm text-[var(--foreground)]">{stripeLine}</dd>
        </div>
        {lifecycle.suspendedAt && (
          <div>
            <dt className="text-xs text-[var(--muted)]">Gesperrt am</dt>
            <dd className="mt-0.5 text-sm text-[var(--foreground)]">
              {formatBillingDate(lifecycle.suspendedAt)}
              {presentSuspensionReason(lifecycle.suspensionReason)
                ? ` · ${presentSuspensionReason(lifecycle.suspensionReason)}`
                : null}
            </dd>
          </div>
        )}
        {lifecycle.terminatedAt && (
          <div>
            <dt className="text-xs text-[var(--muted)]">Vertrag beendet am</dt>
            <dd className="mt-0.5 text-sm text-[var(--foreground)]">
              {formatBillingDate(lifecycle.terminatedAt)}
            </dd>
          </div>
        )}
        {subscription?.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--muted)]">Geplantes Stripe-Periodenende</dt>
            <dd className="mt-0.5 text-sm text-[var(--foreground)]">
              {formatBillingDate(subscription.currentPeriodEnd)}
            </dd>
          </div>
        )}
      </dl>

      {error && (
        <p className="mt-3 text-sm text-[var(--sce-danger)]" role="alert">{error}</p>
      )}
      {success && (
        <p className="mt-3 text-sm text-[var(--sce-success)]" role="status">{success}</p>
      )}
      {stripeWarning && (
        <p className="mt-3 rounded-md border border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] px-3 py-2 text-sm text-[var(--sce-warning)]">
          {stripeWarning}
        </p>
      )}

      <Dialog
        open={suspendOpen}
        onClose={() => !busy && setSuspendOpen(false)}
        title="Tenant sperren"
        description={tenantName}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSuspendOpen(false)} disabled={busy}>
              Abbrechen
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                runAction(
                  () =>
                    postLifecycle(`${basePath}/suspend`, {
                      reason: suspendReason,
                      billingBehavior,
                    }),
                  () => setSuspendOpen(false),
                )
              }
            >
              Tenant sperren
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div>
            <label className="font-medium text-[var(--foreground)]" htmlFor="suspend-reason">
              Grund
            </label>
            <select
              id="suspend-reason"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              value={suspendReason}
              onChange={(e) => {
                const value = e.target.value as typeof suspendReason;
                setSuspendReason(value);
                if (value === "NON_PAYMENT") {
                  setBillingBehavior("KEEP_BILLING");
                }
              }}
            >
              <option value="NON_PAYMENT">Zahlung ausstehend</option>
              <option value="ADMINISTRATIVE">Administrativ</option>
              <option value="OTHER">Sonstiges</option>
            </select>
          </div>
          <div>
            <p className="font-medium text-[var(--foreground)]">Abrechnung während der Sperrung</p>
            <div className="mt-2 space-y-2">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="billing-behavior"
                  checked={billingBehavior === "KEEP_BILLING"}
                  onChange={() => setBillingBehavior("KEEP_BILLING")}
                />
                <span>Abrechnung weiterführen</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="billing-behavior"
                  checked={billingBehavior === "SCHEDULE_CANCELLATION"}
                  onChange={() => setBillingBehavior("SCHEDULE_CANCELLATION")}
                />
                <span>Abonnement zum Periodenende beenden</span>
              </label>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Bereits ausgestellte Rechnungen bleiben unverändert bestehen. Das Stripe-Abonnement
              wird bei Sperrung nicht automatisch gekündigt, ausser Sie wählen die geplante
              Periodenende-Kündigung.
            </p>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={reactivateOpen}
        onClose={() => !busy && setReactivateOpen(false)}
        title="Tenant reaktivieren"
        description="Der Zugriff auf SCE wird für diesen Club wieder freigegeben."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReactivateOpen(false)} disabled={busy}>
              Abbrechen
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                runAction(
                  () =>
                    postLifecycle(`${basePath}/reactivate`, {
                      undoScheduledStripeCancellation: undoCancel,
                    }),
                  () => setReactivateOpen(false),
                )
              }
            >
              Tenant reaktivieren
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="font-medium text-[var(--foreground)]">{tenantName}</p>
          {subscriptionCanceled ? (
            <p className="text-[var(--sce-warning)]">
              Das frühere Stripe-Abonnement wurde bereits beendet. Für die weitere Abrechnung muss
              ein neues Abonnement erstellt werden.
            </p>
          ) : subscription?.cancelAtPeriodEnd ? (
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={undoCancel}
                onChange={(e) => setUndoCancel(e.target.checked)}
              />
              <span>Geplante Stripe-Kündigung ebenfalls zurücknehmen</span>
            </label>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={terminateOpen}
        onClose={() => !busy && setTerminateOpen(false)}
        title="Vertrag beenden"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTerminateOpen(false)} disabled={busy}>
              Abbrechen
            </Button>
            <Button
              variant="danger"
              disabled={busy || !terminateConfirmed}
              onClick={() =>
                runAction(
                  () =>
                    postLifecycle(`${basePath}/terminate`, {
                      reason: terminateReason,
                      confirmed: true,
                    }),
                  () => setTerminateOpen(false),
                )
              }
            >
              Vertrag beenden
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <p>
            <span className="font-medium">{tenantName}</span>
            {subscription?.planName ? ` · ${subscription.planName}` : null}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-[var(--text-2)]">
            <li>SCE-Zugang endet sofort für alle Club-Benutzer.</li>
            <li>
              Das Stripe-Abonnement wird zum Ende der aktuellen Abrechnungsperiode beendet
              {subscription?.currentPeriodEnd
                ? ` (${formatBillingDate(subscription.currentPeriodEnd)})`
                : ""}
              .
            </li>
            <li>Bereits ausgestellte Rechnungen bleiben unverändert.</li>
          </ul>
          <div>
            <label className="font-medium" htmlFor="terminate-reason">Grund</label>
            <select
              id="terminate-reason"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              value={terminateReason}
              onChange={(e) =>
                setTerminateReason(e.target.value as typeof terminateReason)
              }
            >
              <option value="CONTRACT_ENDED">Vertrag ausgelaufen</option>
              <option value="CUSTOMER_REQUEST">Kundenwunsch</option>
              <option value="ADMINISTRATIVE">Administrativ</option>
              <option value="OTHER">Sonstiges</option>
            </select>
          </div>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={terminateConfirmed}
              onChange={(e) => setTerminateConfirmed(e.target.checked)}
            />
            <span>Ich bestätige die Vertragsbeendigung und verstehe die Auswirkungen.</span>
          </label>
        </div>
      </Dialog>
    </section>
  );
}
