import { isExternalSideEffectConfigured } from "@/lib/server/external-side-effect-policy";
import { BILLING_INBOUND_MAILBOX_KEY } from "./billing-inbound-constants";
import {
  countBillingInboundUnresolvedMessages,
  getBillingInboundMailboxState,
  listBillingInboundUnresolvedMessages,
  type BillingInboundUnresolvedListItem,
} from "./billing-inbound-mailbox-repository";
import { getBillingImapConfigReadiness } from "./billing-imap-config";
import { BILLING_INBOUND_CRON_STALE_THRESHOLD_MS } from "@/lib/billing/billing-communication/billing-communication-attachment-cleanup-config";
import { BILLING_COMMUNICATION_RETENTION_POLICY } from "@/lib/billing/billing-communication/billing-communication-retention";

export type BillingInboundMailboxHealth = {
  configured: boolean;
  enabled: boolean;
  mailboxKey: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  uidValidity: string | null;
  lastProcessedUid: string | null;
  unresolvedCount: number;
  cronHealth: "HEALTHY" | "STALE" | "ERROR" | "NOT_CONFIGURED";
  cronHealthLabel: string;
};

export type SerializedBillingInboundUnresolvedItem = {
  id: string;
  receivedAt: string | null;
  receivedAtFormatted: string;
  senderAddress: string;
  subject: string | null;
  reason: string;
  reasonLabel: string;
  detail: string | null;
  attachmentCount: number;
};

export type BillingCommunicationOperationsSnapshot = {
  mailbox: BillingInboundMailboxHealth;
  unresolved: SerializedBillingInboundUnresolvedItem[];
  retentionPolicy: typeof BILLING_COMMUNICATION_RETENTION_POLICY;
  malwareScanning: {
    status: "NOT_CONFIGURED";
    operatorNote: string;
  };
};

const UNRESOLVED_REASON_LABELS: Record<string, string> = {
  UNKNOWN_TENANT: "Mandant unbekannt",
  PARSE_FAILED: "Nachricht nicht lesbar",
  AMBIGUOUS_INVOICE_REFERENCE: "Rechnungsbezug mehrdeutig",
  IDEMPOTENCY_CONFLICT: "Konflikt bei Zuordnung",
};

function formatDateTime(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function isBillingInboundConfigured(): boolean {
  const readiness = getBillingImapConfigReadiness();
  if (!readiness.enabled || !readiness.hostConfigured || !readiness.portConfigured) {
    return false;
  }
  if (!readiness.userConfigured || !readiness.passwordConfigured || !readiness.tlsConfigured) {
    return false;
  }
  return isExternalSideEffectConfigured("billing-inbound-imap", [
    "BILLING_INBOUND_ENABLED",
    "BILLING_IMAP_HOST",
    "BILLING_IMAP_PORT",
    "BILLING_IMAP_TLS",
  ]);
}

function resolveCronHealth(input: {
  configured: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  now: Date;
}): Pick<BillingInboundMailboxHealth, "cronHealth" | "cronHealthLabel"> {
  if (!input.configured) {
    return {
      cronHealth: "NOT_CONFIGURED",
      cronHealthLabel: "Inbound-E-Mail nicht konfiguriert",
    };
  }
  if (input.lastSyncStatus === "ERROR") {
    return {
      cronHealth: "ERROR",
      cronHealthLabel: "Letzter Sync fehlgeschlagen",
    };
  }
  if (!input.lastSyncAt) {
    return {
      cronHealth: "STALE",
      cronHealthLabel: "Noch kein erfolgreicher Sync",
    };
  }
  const ageMs = input.now.getTime() - input.lastSyncAt.getTime();
  if (ageMs > BILLING_INBOUND_CRON_STALE_THRESHOLD_MS) {
    return {
      cronHealth: "STALE",
      cronHealthLabel: "Sync veraltet",
    };
  }
  return {
    cronHealth: "HEALTHY",
    cronHealthLabel: "Sync aktiv",
  };
}

function serializeUnresolved(row: BillingInboundUnresolvedListItem): SerializedBillingInboundUnresolvedItem {
  return {
    id: row.id,
    receivedAt: row.receivedAt?.toISOString() ?? null,
    receivedAtFormatted: formatDateTime(row.receivedAt ?? row.createdAt),
    senderAddress: row.senderAddress,
    subject: row.subject,
    reason: row.reason,
    reasonLabel: UNRESOLVED_REASON_LABELS[row.reason] ?? row.reason,
    detail: row.detail,
    attachmentCount: row.attachmentCount,
  };
}

export async function getBillingCommunicationOperationsSnapshot(input?: {
  now?: Date;
  unresolvedLimit?: number;
}): Promise<BillingCommunicationOperationsSnapshot> {
  const now = input?.now ?? new Date();
  const configured = isBillingInboundConfigured();
  const readiness = getBillingImapConfigReadiness();

  const [mailboxState, unresolvedCount, unresolvedRows] = await Promise.all([
    getBillingInboundMailboxState(BILLING_INBOUND_MAILBOX_KEY),
    countBillingInboundUnresolvedMessages(),
    listBillingInboundUnresolvedMessages({ limit: input?.unresolvedLimit ?? 20 }),
  ]);

  const cronHealth = resolveCronHealth({
    configured,
    lastSyncAt: mailboxState?.lastSyncAt ?? null,
    lastSyncStatus: mailboxState?.lastSyncStatus ?? null,
    now,
  });

  return {
    mailbox: {
      configured,
      enabled: readiness.enabled,
      mailboxKey: BILLING_INBOUND_MAILBOX_KEY,
      lastSyncAt: mailboxState?.lastSyncAt?.toISOString() ?? null,
      lastSyncStatus: mailboxState?.lastSyncStatus ?? null,
      lastError: mailboxState?.lastError ?? null,
      uidValidity: mailboxState?.uidValidity?.toString() ?? null,
      lastProcessedUid: mailboxState?.lastProcessedUid?.toString() ?? null,
      unresolvedCount,
      ...cronHealth,
    },
    unresolved: unresolvedRows.map(serializeUnresolved),
    retentionPolicy: BILLING_COMMUNICATION_RETENTION_POLICY,
    malwareScanning: {
      status: "NOT_CONFIGURED",
      operatorNote:
        "Anhänge werden auf Typ und Grösse geprüft; es findet derzeit keine Malware-Prüfung statt.",
    },
  };
}
