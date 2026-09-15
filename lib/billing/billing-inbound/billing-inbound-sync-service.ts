import { isExternalSideEffectConfigured } from "@/lib/server/external-side-effect-policy";
import {
  BILLING_INBOUND_IMAP_PROVIDER,
  BILLING_INBOUND_MAILBOX_KEY,
  BILLING_INBOUND_SYNC_BATCH_SIZE,
} from "./billing-inbound-constants";
import { ingestBillingInboundImapMessage } from "./billing-inbound-ingestion-service";
import type { BillingInboundSyncSummary } from "./billing-inbound-types";
import {
  getBillingInboundMailboxState,
  upsertBillingInboundMailboxState,
} from "./billing-inbound-mailbox-repository";
import {
  BillingImapConfigurationError,
  getBillingImapConfigReadiness,
  requireBillingImapConfig,
} from "./billing-imap-config";
import { createBillingImapClient } from "./billing-imap-client";
import { formatBillingImapSyncError } from "./billing-imap-sync-error";

function isBillingInboundImapConfigured(): boolean {
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

export async function runBillingInboundImapSync(): Promise<BillingInboundSyncSummary> {
  const summary: BillingInboundSyncSummary = {
    mailboxKey: BILLING_INBOUND_MAILBOX_KEY,
    fetched: 0,
    ingested: 0,
    duplicate: 0,
    unresolved: 0,
    failed: 0,
    skipped: false,
  };

  if (!isBillingInboundImapConfigured()) {
    summary.skipped = true;
    summary.skipReason = "NOT_CONFIGURED";
    return summary;
  }

  let config;
  try {
    config = requireBillingImapConfig();
  } catch (error) {
    summary.skipped = true;
    summary.skipReason =
      error instanceof BillingImapConfigurationError ? "NOT_CONFIGURED" : "CONFIG_ERROR";
    return summary;
  }

  const state = await getBillingInboundMailboxState(BILLING_INBOUND_MAILBOX_KEY);
  const client = await createBillingImapClient();

  let uidValidity = state?.uidValidity ?? null;
  let lastProcessedUid = state?.lastProcessedUid ?? null;

  try {
    const batch = await client.fetchNewInboxMessages({
      config,
      uidValidity,
      lastProcessedUid,
      batchSize: BILLING_INBOUND_SYNC_BATCH_SIZE,
    });

    if (
      state?.uidValidity !== null &&
      state?.uidValidity !== undefined &&
      BigInt(batch.uidValidity) !== state.uidValidity
    ) {
      uidValidity = BigInt(batch.uidValidity);
      lastProcessedUid = null;
      await upsertBillingInboundMailboxState({
        mailboxKey: BILLING_INBOUND_MAILBOX_KEY,
        uidValidity,
        lastProcessedUid,
        lastSyncAt: new Date(),
        lastSyncStatus: "UIDVALIDITY_RESET",
        lastError: null,
      });
      return summary;
    }

    if (uidValidity === null) {
      uidValidity = BigInt(batch.uidValidity);
    }

    summary.fetched = batch.messages.length;

    let cursorAdvanceUid = lastProcessedUid ? Number(lastProcessedUid) : 0;

    for (const message of batch.messages) {
      const result = await ingestBillingInboundImapMessage(message);
      console.info("[billing/inbound-sync] message", {
        provider: BILLING_INBOUND_IMAP_PROVIDER,
        providerMessageId: message.providerMessageId,
        result: result.kind,
        communicationId: result.kind === "INGESTED" || result.kind === "DUPLICATE"
          ? result.communicationId
          : undefined,
        tenantId:
          result.kind === "INGESTED" || result.kind === "DUPLICATE"
            ? result.tenantId
            : undefined,
      });

      if (result.kind === "INGESTED") summary.ingested += 1;
      if (result.kind === "DUPLICATE") summary.duplicate += 1;
      if (result.kind === "UNRESOLVED") summary.unresolved += 1;
      if (result.kind === "FAILED") {
        summary.failed += 1;
        if (result.retryable) {
          break;
        }
      }

      if (result.kind !== "FAILED" || !result.retryable) {
        cursorAdvanceUid = Math.max(cursorAdvanceUid, message.uid);
      } else {
        break;
      }
    }

    if (batch.messages.length === 0 && batch.highestUid === null) {
      // no-op cursor
    } else if (cursorAdvanceUid > (lastProcessedUid ? Number(lastProcessedUid) : 0)) {
      lastProcessedUid = BigInt(cursorAdvanceUid);
    }

    await upsertBillingInboundMailboxState({
      mailboxKey: BILLING_INBOUND_MAILBOX_KEY,
      uidValidity,
      lastProcessedUid,
      lastSyncAt: new Date(),
      lastSyncStatus: "OK",
      lastError: null,
    });
  } catch (error) {
    const message = formatBillingImapSyncError(error);
    await upsertBillingInboundMailboxState({
      mailboxKey: BILLING_INBOUND_MAILBOX_KEY,
      uidValidity,
      lastProcessedUid,
      lastSyncAt: new Date(),
      lastSyncStatus: "ERROR",
      lastError: message,
    });
    throw error;
  }

  return summary;
}
