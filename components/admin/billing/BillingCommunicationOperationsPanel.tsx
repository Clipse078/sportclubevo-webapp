import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import type { BillingCommunicationOperationsSnapshot } from "@/lib/billing/billing-inbound/billing-inbound-operations-service";

import BillingInboundUnresolvedResolveForm from "@/components/admin/billing/BillingInboundUnresolvedResolveForm";

type Props = {
  snapshot: BillingCommunicationOperationsSnapshot;
  canManage?: boolean;
};

function cronTone(
  health: BillingCommunicationOperationsSnapshot["mailbox"]["cronHealth"],
): "success" | "warning" | "muted" | "default" {
  switch (health) {
    case "HEALTHY":
      return "success";
    case "ERROR":
      return "warning";
    case "STALE":
      return "warning";
    default:
      return "muted";
  }
}

export default function BillingCommunicationOperationsPanel({
  snapshot,
  canManage = false,
}: Props) {
  const { mailbox, unresolved, malwareScanning } = snapshot;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        Kommunikation
      </h2>
      <BillingPanel>
        <div className="space-y-4 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[var(--foreground)]">Inbound-Status</span>
            <BillingStatusBadge label={mailbox.cronHealthLabel} tone={cronTone(mailbox.cronHealth)} />
            {mailbox.unresolvedCount > 0 ? (
              <BillingStatusBadge
                label={`${mailbox.unresolvedCount} offen`}
                tone="warning"
              />
            ) : null}
          </div>

          <dl className="grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
            <div>
              <dt>Postfach</dt>
              <dd className="text-[var(--foreground)]">{mailbox.mailboxKey}</dd>
            </div>
            <div>
              <dt>Konfiguration</dt>
              <dd className="text-[var(--foreground)]">
                {mailbox.configured ? "Aktiv" : "Nicht konfiguriert"}
              </dd>
            </div>
            <div>
              <dt>Letzter Sync</dt>
              <dd className="text-[var(--foreground)]">
                {mailbox.lastSyncAt
                  ? new Intl.DateTimeFormat("de-CH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(mailbox.lastSyncAt))
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Sync-Status</dt>
              <dd className="text-[var(--foreground)]">{mailbox.lastSyncStatus ?? "—"}</dd>
            </div>
            {mailbox.lastError ? (
              <div className="sm:col-span-2">
                <dt>Letzter Fehler</dt>
                <dd className="text-[var(--foreground)]">{mailbox.lastError}</dd>
              </div>
            ) : null}
          </dl>

          <p className="text-xs text-[var(--muted)]">{malwareScanning.operatorNote}</p>

          {unresolved.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Nicht zugeordnete Nachrichten
              </p>
              <ul className="divide-y divide-[color-mix(in_srgb,var(--border)_40%,transparent)] rounded-md ring-1 ring-[color-mix(in_srgb,var(--border)_45%,transparent)]">
                {unresolved.map((item) => (
                  <li key={item.id} className="space-y-1 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-[var(--foreground)]">
                        {item.subject?.trim() || "(Ohne Betreff)"}
                      </span>
                      <time className="text-xs tabular-nums text-[var(--muted)]">
                        {item.receivedAtFormatted}
                      </time>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      Von {item.senderAddress} · {item.reasonLabel}
                      {item.attachmentCount > 0
                        ? ` · ${item.attachmentCount} Anhang${item.attachmentCount === 1 ? "" : "e"}`
                        : ""}
                    </p>
                    {item.detail ? (
                      <p className="text-xs text-[var(--muted)]">{item.detail}</p>
                    ) : null}
                    {canManage ? (
                      <BillingInboundUnresolvedResolveForm unresolvedMessageId={item.id} />
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </BillingPanel>
    </section>
  );
}
