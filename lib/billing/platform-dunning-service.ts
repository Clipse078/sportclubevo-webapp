import type { BillingDunningStatus, TenantStatus } from "@prisma/client";
import { logAction } from "@/lib/audit/log-action";
import { isTenantBillingDelinquencyResolved } from "@/lib/billing/billing-delinquency";
import { DUNNING_AUDIT_ACTIONS, DUNNING_AUDIT_MODULE } from "@/lib/billing/dunning-audit";
import {
  computeGracePeriodEnd,
  DUNNING_CRON_BATCH_SIZE,
  isDunningExemptionActive,
} from "@/lib/billing/dunning-policy";
import { withTenantDunningLock } from "@/lib/billing/dunning-lock";
import type { DunningBatchSummary } from "@/lib/billing/dunning-types";
import { getTenantDunningPolicy } from "@/lib/billing/tenant-dunning-policy-service";
import {
  findBillingAccountByStripeCustomerId,
  findBillingAccountByTenantId,
  findBillingAccountsForDunningReconciliation,
  findGracePeriodBillingAccountsDue,
  updateTenantBillingAccountDunning,
} from "@/lib/billing/tenant-billing-account-repository";
import type { TenantBillingAccountRecord } from "@/lib/billing/tenant-billing-account-types";
import {
  getTenantBillingSummary,
  getTenantOpenInvoicesForDelinquency,
} from "@/lib/integrations/stripe/billing-read-service";
import { prisma } from "@/lib/db/prisma";
import {
  reactivatePlatformTenant,
  suspendPlatformTenant,
} from "@/lib/tenants/platform-tenant-lifecycle-service";

function auditDunning(input: {
  tenantId: string;
  action: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  metadataJson?: unknown;
}): void {
  void logAction({
    actorUserId: null,
    tenantId: input.tenantId,
    moduleKey: DUNNING_AUDIT_MODULE,
    entityType: "TenantBillingAccount",
    entityId: input.tenantId,
    action: input.action,
    beforeJson: input.beforeJson,
    afterJson: input.afterJson,
    metadataJson: input.metadataJson,
  });
}

function isTerminalTenantStatus(status: TenantStatus): boolean {
  return status === "TERMINATED" || status === "ARCHIVED";
}

function canAutomatedReactivation(input: {
  tenantStatus: TenantStatus;
  suspensionReason: string | null;
  suspensionActionSource: string | null;
}): boolean {
  if (input.tenantStatus !== "SUSPENDED") {
    return false;
  }
  if (input.suspensionReason !== "NON_PAYMENT") {
    return false;
  }
  return input.suspensionActionSource === "DUNNING_AUTOMATION";
}

async function loadTenantRow(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      status: true,
      suspensionReason: true,
      suspensionActionSource: true,
    },
  });
}

async function fetchDelinquencyState(tenantId: string) {
  const summary = await getTenantBillingSummary(tenantId);
  const openInvoices = await getTenantOpenInvoicesForDelinquency(tenantId);
  const delinquent = !isTenantBillingDelinquencyResolved(summary, openInvoices);
  return { summary, openInvoices, delinquent };
}

export async function handlePaymentFailure(input: {
  stripeCustomerId: string;
  eventAt: Date;
  stripeEventId: string;
}): Promise<"ignored" | "started_grace" | "updated_grace" | "duplicate_episode"> {
  const account = await findBillingAccountByStripeCustomerId(input.stripeCustomerId);
  if (!account) {
    console.info("[dunning] payment failure for unknown Stripe customer", {
      stripeCustomerId: input.stripeCustomerId,
    });
    return "ignored";
  }

  return withTenantDunningLock(account.tenantId, async () => {
    const tenant = await loadTenantRow(account.tenantId);
    if (!tenant || isTerminalTenantStatus(tenant.status)) {
      return "ignored";
    }

    const fresh = await findBillingAccountByTenantId(account.tenantId);
    if (!fresh) {
      return "ignored";
    }

    const policy = await getTenantDunningPolicy(account.tenantId, input.eventAt);
    const now = input.eventAt;

    if (
      fresh.dunningStatus === "GRACE_PERIOD" &&
      fresh.firstPaymentFailureAt &&
      fresh.gracePeriodEndsAt
    ) {
      await updateTenantBillingAccountDunning(account.tenantId, {
        latestPaymentFailureAt: now,
        lastDunningEventAt: now,
        lastStripeEventId: input.stripeEventId,
      });
      console.info("[dunning] repeated payment failure during grace", {
        tenantId: account.tenantId,
      });
      return "updated_grace";
    }

    if (fresh.dunningStatus !== "CURRENT" && fresh.dunningStatus !== "RESOLVED") {
      await updateTenantBillingAccountDunning(account.tenantId, {
        latestPaymentFailureAt: now,
        lastDunningEventAt: now,
        lastStripeEventId: input.stripeEventId,
      });
      return "duplicate_episode";
    }

    const graceEnd = computeGracePeriodEnd(now, policy.graceDays);
    const updated = await updateTenantBillingAccountDunning(account.tenantId, {
      dunningStatus: "GRACE_PERIOD",
      firstPaymentFailureAt: now,
      latestPaymentFailureAt: now,
      gracePeriodEndsAt: graceEnd,
      resolvedAt: null,
      automaticallySuspendedAt: null,
      lastDunningEventAt: now,
      lastStripeEventId: input.stripeEventId,
    });

    auditDunning({
      tenantId: account.tenantId,
      action: DUNNING_AUDIT_ACTIONS.STARTED,
      beforeJson: { dunningStatus: fresh.dunningStatus },
      afterJson: {
        dunningStatus: updated.dunningStatus,
        gracePeriodEndsAt: updated.gracePeriodEndsAt,
      },
      metadataJson: { graceDays: policy.graceDays },
    });

    console.info("[dunning] grace period started", {
      tenantId: account.tenantId,
      gracePeriodEndsAt: graceEnd.toISOString(),
    });

    return "started_grace";
  });
}

async function markDunningResolved(
  account: TenantBillingAccountRecord,
  stripeEventId?: string,
): Promise<void> {
  const before = account.dunningStatus;
  const updated = await updateTenantBillingAccountDunning(account.tenantId, {
    dunningStatus: "RESOLVED",
    resolvedAt: new Date(),
    gracePeriodEndsAt: null,
    lastDunningEventAt: new Date(),
    lastStripeEventId: stripeEventId ?? account.lastStripeEventId,
  });

  auditDunning({
    tenantId: account.tenantId,
    action: DUNNING_AUDIT_ACTIONS.RESOLVED,
    beforeJson: { dunningStatus: before },
    afterJson: { dunningStatus: updated.dunningStatus },
  });
}

export async function attemptAutomaticReactivation(input: {
  tenantId: string;
  stripeEventId?: string;
}): Promise<"reactivated" | "blocked" | "not_needed"> {
  const tenant = await loadTenantRow(input.tenantId);
  if (
    !tenant ||
    !canAutomatedReactivation({
      tenantStatus: tenant.status,
      suspensionReason: tenant.suspensionReason,
      suspensionActionSource: tenant.suspensionActionSource,
    })
  ) {
    console.info("[dunning] automatic reactivation blocked by lifecycle state", {
      tenantId: input.tenantId,
      status: tenant?.status,
      suspensionActionSource: tenant?.suspensionActionSource,
    });
    return "blocked";
  }

  const result = await reactivatePlatformTenant({
    tenantId: input.tenantId,
    actorUserId: null,
    undoScheduledStripeCancellation: false,
    actionSource: "DUNNING_AUTOMATION",
  });

  if (!result.ok) {
    if (result.code === "LOCAL_PERSIST_FAILED") {
      await updateTenantBillingAccountDunning(input.tenantId, {
        dunningStatus: "REQUIRES_REVIEW",
      });
    }
    return "blocked";
  }

  if (result.outcome === "already_active") {
    return "not_needed";
  }

  auditDunning({
    tenantId: input.tenantId,
    action: DUNNING_AUDIT_ACTIONS.AUTO_REACTIVATED,
    beforeJson: { status: "SUSPENDED" },
    afterJson: { status: "ACTIVE" },
    metadataJson: { stripeEventId: input.stripeEventId ?? null },
  });

  console.info("[dunning] automatic reactivation performed", {
    tenantId: input.tenantId,
  });

  return "reactivated";
}

export async function handleBillingRecovery(input: {
  stripeCustomerId: string;
  stripeEventId?: string;
}): Promise<"ignored" | "resolved" | "reactivated" | "still_delinquent"> {
  const account = await findBillingAccountByStripeCustomerId(input.stripeCustomerId);
  if (!account) {
    return "ignored";
  }

  return withTenantDunningLock(account.tenantId, async () => {
    const tenant = await loadTenantRow(account.tenantId);
    if (!tenant || isTerminalTenantStatus(tenant.status)) {
      return "ignored";
    }

    let delinquency;
    try {
      delinquency = await fetchDelinquencyState(account.tenantId);
    } catch (error) {
      console.error("[dunning] Stripe unavailable during recovery", {
        tenantId: account.tenantId,
        error,
      });
      return "still_delinquent";
    }

    if (delinquency.delinquent) {
      return "still_delinquent";
    }

    const fresh = await findBillingAccountByTenantId(account.tenantId);
    if (!fresh) {
      return "ignored";
    }

    if (fresh.dunningStatus !== "CURRENT") {
      await markDunningResolved(fresh, input.stripeEventId);
    }

    const reactivation = await attemptAutomaticReactivation({
      tenantId: account.tenantId,
      stripeEventId: input.stripeEventId,
    });

    if (reactivation === "reactivated") {
      await updateTenantBillingAccountDunning(account.tenantId, {
        dunningStatus: "CURRENT",
        firstPaymentFailureAt: null,
        latestPaymentFailureAt: null,
        automaticallySuspendedAt: null,
      });
      return "reactivated";
    }

    if (fresh.dunningStatus !== "CURRENT") {
      return "resolved";
    }

    return "resolved";
  });
}

export async function enforceExpiredGraceForAccount(
  account: TenantBillingAccountRecord,
): Promise<"suspended" | "skipped_paid" | "skipped_exempt" | "skipped_disabled" | "skipped_manual" | "failed"> {
  const tenant = await loadTenantRow(account.tenantId);
  if (!tenant || isTerminalTenantStatus(tenant.status)) {
    return "skipped_manual";
  }

  if (!account.automaticDunningEnabled) {
    return "skipped_disabled";
  }

  if (isDunningExemptionActive(account.dunningExemptUntil)) {
    return "skipped_exempt";
  }

  if (
    !account.gracePeriodEndsAt ||
    account.gracePeriodEndsAt.getTime() > Date.now()
  ) {
    return "skipped_paid";
  }

  let delinquency;
  try {
    delinquency = await fetchDelinquencyState(account.tenantId);
  } catch (error) {
    console.error("[dunning] Stripe unavailable before suspension", {
      tenantId: account.tenantId,
      error,
    });
    return "failed";
  }

  if (!delinquency.delinquent) {
    console.info("[dunning] grace expired but payment recovered — no suspension", {
      tenantId: account.tenantId,
    });
    await markDunningResolved(account);
    await attemptAutomaticReactivation({ tenantId: account.tenantId });
    return "skipped_paid";
  }

  if (
    tenant.status === "SUSPENDED" &&
    tenant.suspensionActionSource !== "DUNNING_AUTOMATION"
  ) {
    await updateTenantBillingAccountDunning(account.tenantId, {
      dunningStatus: "SUSPENDED",
      lastDunningEventAt: new Date(),
    });
    return "skipped_manual";
  }

  const suspendResult = await suspendPlatformTenant({
    tenantId: account.tenantId,
    actorUserId: null,
    reason: "NON_PAYMENT",
    billingBehavior: "KEEP_BILLING",
    actionSource: "DUNNING_AUTOMATION",
  });

  if (!suspendResult.ok) {
    if (suspendResult.reconciliationRequired || suspendResult.code === "LOCAL_PERSIST_FAILED") {
      await updateTenantBillingAccountDunning(account.tenantId, {
        dunningStatus: "REQUIRES_REVIEW",
      });
    }
    return "failed";
  }

  if (suspendResult.outcome === "already_suspended") {
    await updateTenantBillingAccountDunning(account.tenantId, {
      dunningStatus: "SUSPENDED",
      automaticallySuspendedAt: account.automaticallySuspendedAt ?? new Date(),
      lastDunningEventAt: new Date(),
    });
    return "suspended";
  }

  const now = new Date();
  await updateTenantBillingAccountDunning(account.tenantId, {
    dunningStatus: "SUSPENDED",
    automaticallySuspendedAt: now,
    lastDunningEventAt: now,
  });

  auditDunning({
    tenantId: account.tenantId,
    action: DUNNING_AUDIT_ACTIONS.AUTO_SUSPENDED,
    beforeJson: { status: suspendResult.previousStatus },
    afterJson: { status: "SUSPENDED" },
  });

  console.info("[dunning] automatic suspension performed", {
    tenantId: account.tenantId,
  });

  return "suspended";
}

export async function reconcileTenantDunning(tenantId: string): Promise<void> {
  await withTenantDunningLock(tenantId, async () => {
    const account = await findBillingAccountByTenantId(tenantId);
    if (!account) {
      return;
    }
    const tenant = await loadTenantRow(tenantId);
    if (!tenant || isTerminalTenantStatus(tenant.status)) {
      return;
    }

    let delinquency;
    try {
      delinquency = await fetchDelinquencyState(tenantId);
    } catch {
      return;
    }

    if (!delinquency.delinquent) {
      if (account.dunningStatus === "GRACE_PERIOD" || account.dunningStatus === "SUSPENDED") {
        await markDunningResolved(account);
      }
      await attemptAutomaticReactivation({ tenantId });
      return;
    }

    if (
      account.dunningStatus === "GRACE_PERIOD" &&
      account.gracePeriodEndsAt &&
      account.gracePeriodEndsAt.getTime() <= Date.now()
    ) {
      await enforceExpiredGraceForAccount(account);
    }
  });
}

export async function processBillingDunning(): Promise<DunningBatchSummary> {
  const summary: DunningBatchSummary = {
    evaluated: 0,
    suspended: 0,
    reactivated: 0,
    resolved: 0,
    exempt: 0,
    skipped: 0,
    failed: 0,
    reconciliationRequired: 0,
    remainingGraceCandidates: 0,
  };

  const dueAccounts = await findGracePeriodBillingAccountsDue(
    new Date(),
    DUNNING_CRON_BATCH_SIZE,
  );

  for (const account of dueAccounts) {
    summary.evaluated += 1;
    try {
      const outcome = await withTenantDunningLock(account.tenantId, async () =>
        enforceExpiredGraceForAccount(account),
      );
      if (outcome === "suspended") summary.suspended += 1;
      else if (outcome === "skipped_paid") {
        summary.resolved += 1;
        summary.skipped += 1;
      } else if (outcome === "skipped_exempt") summary.exempt += 1;
      else if (outcome === "skipped_disabled" || outcome === "skipped_manual") {
        summary.skipped += 1;
      } else if (outcome === "failed") summary.failed += 1;
    } catch (error) {
      summary.failed += 1;
      console.error("[dunning] grace enforcement failed for tenant", {
        tenantId: account.tenantId,
        error,
      });
    }
  }

  const reconcileBatch = await findBillingAccountsForDunningReconciliation(
    DUNNING_CRON_BATCH_SIZE,
    0,
  );

  for (const account of reconcileBatch) {
    summary.evaluated += 1;
    try {
      await reconcileTenantDunning(account.tenantId);
    } catch (error) {
      summary.failed += 1;
      console.error("[dunning] reconciliation failed", {
        tenantId: account.tenantId,
        error,
      });
    }
  }

  summary.remainingGraceCandidates = await prisma.tenantBillingAccount.count({
    where: {
      dunningStatus: "GRACE_PERIOD",
      gracePeriodEndsAt: { lte: new Date() },
      automaticDunningEnabled: true,
    },
  });

  const requiresReview = await prisma.tenantBillingAccount.count({
    where: { dunningStatus: "REQUIRES_REVIEW" },
  });
  summary.reconciliationRequired = requiresReview;

  return summary;
}

export async function setDunningAutomationEnabled(input: {
  tenantId: string;
  enabled: boolean;
  actorUserId: string;
}): Promise<TenantBillingAccountRecord> {
  return updateTenantBillingAccountDunning(input.tenantId, {
    automaticDunningEnabled: input.enabled,
  });
}

export async function setDunningExemption(input: {
  tenantId: string;
  exemptUntil: Date;
  note?: string | null;
  actorUserId: string;
}): Promise<TenantBillingAccountRecord> {
  const updated = await updateTenantBillingAccountDunning(input.tenantId, {
    dunningExemptUntil: input.exemptUntil,
    dunningExemptNote: input.note?.trim() || null,
    dunningStatus: "EXEMPT",
    lastDunningEventAt: new Date(),
  });

  auditDunning({
    tenantId: input.tenantId,
    action: DUNNING_AUDIT_ACTIONS.EXEMPTION_SET,
    afterJson: {
      dunningExemptUntil: updated.dunningExemptUntil,
    },
    metadataJson: { actorUserId: input.actorUserId },
  });

  return updated;
}

export async function clearDunningExemption(input: {
  tenantId: string;
  actorUserId: string;
}): Promise<TenantBillingAccountRecord> {
  const account = await findBillingAccountByTenantId(input.tenantId);
  const nextStatus: BillingDunningStatus =
    account?.dunningStatus === "EXEMPT" ? "CURRENT" : account?.dunningStatus ?? "CURRENT";

  const updated = await updateTenantBillingAccountDunning(input.tenantId, {
    dunningExemptUntil: null,
    dunningExemptNote: null,
    dunningStatus: nextStatus === "EXEMPT" ? "CURRENT" : nextStatus,
    lastDunningEventAt: new Date(),
  });

  auditDunning({
    tenantId: input.tenantId,
    action: DUNNING_AUDIT_ACTIONS.EXEMPTION_REMOVED,
    metadataJson: { actorUserId: input.actorUserId },
  });

  return updated;
}

export function extractStripeCustomerIdFromEvent(
  object: Record<string, unknown>,
): string | null {
  const customer = object.customer;
  if (typeof customer === "string") {
    return customer;
  }
  if (customer && typeof customer === "object" && "id" in customer) {
    const id = (customer as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

export function isPaymentFailureStripeEvent(type: string): boolean {
  return type === "invoice.payment_failed";
}

export function isBillingRecoveryStripeEvent(type: string): boolean {
  return (
    type === "invoice.paid" ||
    type === "invoice.payment_succeeded" ||
    type === "invoice.updated"
  );
}
