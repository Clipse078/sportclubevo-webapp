import type { TenantLifecycleActionSource, TenantStatus } from "@prisma/client";
import { logAction } from "@/lib/audit/log-action";
import { prisma } from "@/lib/db/prisma";
import {
  resolveTenantPrimarySubscription,
  scheduleSubscriptionEndAtPeriod,
  undoSubscriptionCancellation,
} from "@/lib/integrations/stripe/stripe-subscription-write-service";
import { StripeIntegrationError } from "@/lib/integrations/stripe/errors";
import {
  TENANT_LIFECYCLE_AUDIT_ACTIONS,
  TENANT_LIFECYCLE_AUDIT_MODULE,
  type LifecycleCommandResult,
  type SuspensionBillingBehavior,
  type TenantLifecycleSnapshot,
  TenantLifecycleError,
} from "./tenant-lifecycle-types";

const CANCELED_SUBSCRIPTION_WARNING =
  "Das frühere Stripe-Abonnement wurde bereits beendet. Für die weitere Abrechnung muss ein neues Abonnement erstellt werden.";

const PARTIAL_FAILURE_MESSAGE =
  "Aktion konnte nicht vollständig abgeschlossen werden.";

function toSnapshot(row: {
  id: string;
  key: string;
  name: string;
  status: TenantStatus;
  suspendedAt: Date | null;
  suspensionReason: TenantLifecycleSnapshot["suspensionReason"];
  suspensionReasonNote: string | null;
  suspensionActionSource: TenantLifecycleSnapshot["suspensionActionSource"];
  reactivatedAt: Date | null;
  terminatedAt: Date | null;
  terminationReason: TenantLifecycleSnapshot["terminationReason"];
  terminationReasonNote: string | null;
}): TenantLifecycleSnapshot {
  return {
    tenantId: row.id,
    tenantKey: row.key,
    tenantName: row.name,
    status: row.status,
    suspendedAt: row.suspendedAt?.toISOString() ?? null,
    suspensionReason: row.suspensionReason,
    suspensionReasonNote: row.suspensionReasonNote,
    suspensionActionSource: row.suspensionActionSource,
    reactivatedAt: row.reactivatedAt?.toISOString() ?? null,
    terminatedAt: row.terminatedAt?.toISOString() ?? null,
    terminationReason: row.terminationReason,
    terminationReasonNote: row.terminationReasonNote,
  };
}

const lifecycleSelect = {
  id: true,
  key: true,
  name: true,
  status: true,
  suspendedAt: true,
  suspensionReason: true,
  suspensionReasonNote: true,
  suspensionActionSource: true,
  reactivatedAt: true,
  terminatedAt: true,
  terminationReason: true,
  terminationReasonNote: true,
} as const;

export async function getTenantLifecycleSnapshot(
  tenantId: string,
): Promise<TenantLifecycleSnapshot | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: lifecycleSelect,
  });
  return tenant ? toSnapshot(tenant) : null;
}

async function auditLifecycle(
  input: {
    actorUserId: string | null;
    tenantId: string;
    action: string;
    beforeStatus: TenantStatus;
    afterStatus: TenantStatus;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  void logAction({
    actorUserId: input.actorUserId ?? null,
    moduleKey: TENANT_LIFECYCLE_AUDIT_MODULE,
    entityType: "Tenant",
    entityId: input.tenantId,
    action: input.action,
    tenantId: input.tenantId,
    beforeJson: { status: input.beforeStatus },
    afterJson: { status: input.afterStatus },
    metadataJson: input.metadata,
  });
}

export async function suspendPlatformTenant(input: {
  tenantId: string;
  actorUserId?: string | null;
  reason: "NON_PAYMENT" | "ADMINISTRATIVE" | "OTHER";
  reasonNote?: string | null;
  billingBehavior: SuspensionBillingBehavior;
  actionSource?: TenantLifecycleActionSource;
}): Promise<LifecycleCommandResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: lifecycleSelect,
  });

  if (!tenant) {
    return { ok: false, code: "TENANT_NOT_FOUND", message: "Tenant nicht gefunden." };
  }

  if (tenant.status === "SUSPENDED") {
    return {
      ok: true,
      outcome: "already_suspended",
      previousStatus: tenant.status,
      newStatus: tenant.status,
      tenant: toSnapshot(tenant),
    };
  }

  if (tenant.status === "TERMINATED" || tenant.status === "ARCHIVED") {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: "Dieser Tenant kann nicht gesperrt werden.",
    };
  }

  if (input.billingBehavior === "SCHEDULE_CANCELLATION") {
    try {
      await scheduleSubscriptionEndAtPeriod(input.tenantId);
    } catch (error) {
      const message =
        error instanceof StripeIntegrationError
          ? error.message
          : "Stripe-Kündigung konnte nicht geplant werden.";
      return { ok: false, code: "STRIPE_FAILED", message };
    }
  }

  const now = new Date();
  try {
    const updated = await prisma.tenant.update({
      where: { id: input.tenantId },
      data: {
        status: "SUSPENDED",
        suspendedAt: now,
        suspendedByUserId: input.actorUserId ?? null,
        suspensionReason: input.reason,
        suspensionReasonNote: input.reasonNote?.trim() || null,
        suspensionActionSource: input.actionSource ?? "MANUAL",
        reactivatedAt: null,
        reactivatedByUserId: null,
      },
      select: lifecycleSelect,
    });

    await auditLifecycle({
      actorUserId: input.actorUserId,
      tenantId: input.tenantId,
      action: TENANT_LIFECYCLE_AUDIT_ACTIONS.SUSPENDED,
      beforeStatus: tenant.status,
      afterStatus: "SUSPENDED",
      metadata: {
        suspensionReason: input.reason,
        billingBehavior: input.billingBehavior,
        actionSource: input.actionSource ?? "MANUAL",
      },
    });

    return {
      ok: true,
      outcome: "applied",
      previousStatus: tenant.status,
      newStatus: "SUSPENDED",
      tenant: toSnapshot(updated),
    };
  } catch (error) {
    console.error("Tenant suspend: local persist failed after Stripe step", {
      tenantId: input.tenantId,
      billingBehavior: input.billingBehavior,
      error,
    });
    return {
      ok: false,
      code: "LOCAL_PERSIST_FAILED",
      message: PARTIAL_FAILURE_MESSAGE,
      reconciliationRequired: input.billingBehavior === "SCHEDULE_CANCELLATION",
    };
  }
}

export async function reactivatePlatformTenant(input: {
  tenantId: string;
  actorUserId?: string | null;
  undoScheduledStripeCancellation: boolean;
  actionSource?: TenantLifecycleActionSource;
}): Promise<LifecycleCommandResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: lifecycleSelect,
  });

  if (!tenant) {
    return { ok: false, code: "TENANT_NOT_FOUND", message: "Tenant nicht gefunden." };
  }

  if (tenant.status === "ACTIVE") {
    return {
      ok: true,
      outcome: "already_active",
      previousStatus: tenant.status,
      newStatus: tenant.status,
      tenant: toSnapshot(tenant),
    };
  }

  if (tenant.status !== "SUSPENDED") {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: "Nur gesperrte Tenants können reaktiviert werden.",
    };
  }

  let stripeWarning: string | undefined;

  if (input.undoScheduledStripeCancellation) {
    try {
      const sub = await resolveTenantPrimarySubscription(input.tenantId);
      if (!sub) {
        stripeWarning = CANCELED_SUBSCRIPTION_WARNING;
      } else if (sub.status === "canceled") {
        stripeWarning = CANCELED_SUBSCRIPTION_WARNING;
      } else if (sub.cancelAtPeriodEnd) {
        await undoSubscriptionCancellation(input.tenantId);
      }
    } catch (error) {
      const message =
        error instanceof StripeIntegrationError
          ? error.message
          : "Geplante Stripe-Kündigung konnte nicht zurückgenommen werden.";
      return { ok: false, code: "STRIPE_FAILED", message };
    }
  } else {
    try {
      const sub = await resolveTenantPrimarySubscription(input.tenantId);
      if (sub?.status === "canceled") {
        stripeWarning = CANCELED_SUBSCRIPTION_WARNING;
      }
    } catch {
      // Non-blocking read for warning display
    }
  }

  const now = new Date();
  try {
    const updated = await prisma.tenant.update({
      where: { id: input.tenantId },
      data: {
        status: "ACTIVE",
        reactivatedAt: now,
        reactivatedByUserId: input.actorUserId ?? null,
      },
      select: lifecycleSelect,
    });

    await auditLifecycle({
      actorUserId: input.actorUserId ?? null,
      tenantId: input.tenantId,
      action: TENANT_LIFECYCLE_AUDIT_ACTIONS.REACTIVATED,
      beforeStatus: tenant.status,
      afterStatus: "ACTIVE",
      metadata: {
        undoScheduledStripeCancellation: input.undoScheduledStripeCancellation,
        actionSource: input.actionSource ?? "MANUAL",
      },
    });

    return {
      ok: true,
      outcome: "applied",
      previousStatus: tenant.status,
      newStatus: "ACTIVE",
      tenant: toSnapshot(updated),
      stripeWarning,
    };
  } catch (error) {
    console.error("Tenant reactivate: local persist failed after Stripe step", {
      tenantId: input.tenantId,
      error,
    });
    return {
      ok: false,
      code: "LOCAL_PERSIST_FAILED",
      message: PARTIAL_FAILURE_MESSAGE,
      reconciliationRequired: input.undoScheduledStripeCancellation,
    };
  }
}

/**
 * Commercial contract termination — SCE access ends immediately (01F policy).
 * Stripe subscription is scheduled to end at the current period end when linked.
 */
export async function terminatePlatformTenant(input: {
  tenantId: string;
  actorUserId: string;
  reason: "CONTRACT_ENDED" | "CUSTOMER_REQUEST" | "ADMINISTRATIVE" | "OTHER";
  reasonNote?: string | null;
}): Promise<LifecycleCommandResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: lifecycleSelect,
  });

  if (!tenant) {
    return { ok: false, code: "TENANT_NOT_FOUND", message: "Tenant nicht gefunden." };
  }

  if (tenant.status === "TERMINATED") {
    return {
      ok: true,
      outcome: "already_terminated",
      previousStatus: tenant.status,
      newStatus: tenant.status,
      tenant: toSnapshot(tenant),
    };
  }

  if (tenant.status === "ARCHIVED") {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: "Archivierte Tenants können nicht beendet werden.",
    };
  }

  try {
    const sub = await resolveTenantPrimarySubscription(input.tenantId);
    if (sub && sub.status !== "canceled") {
      await scheduleSubscriptionEndAtPeriod(input.tenantId);
    }
  } catch (error) {
    if (
      error instanceof StripeIntegrationError &&
      error.code === "NO_BILLING_ACCOUNT"
    ) {
      // Termination without Stripe linkage is allowed.
    } else {
      const message =
        error instanceof StripeIntegrationError
          ? error.message
          : "Stripe-Abonnement konnte nicht zum Periodenende beendet werden.";
      return { ok: false, code: "STRIPE_FAILED", message };
    }
  }

  const now = new Date();
  try {
    const updated = await prisma.tenant.update({
      where: { id: input.tenantId },
      data: {
        status: "TERMINATED",
        terminatedAt: now,
        terminatedByUserId: input.actorUserId,
        terminationReason: input.reason,
        terminationReasonNote: input.reasonNote?.trim() || null,
      },
      select: lifecycleSelect,
    });

    await auditLifecycle({
      actorUserId: input.actorUserId,
      tenantId: input.tenantId,
      action: TENANT_LIFECYCLE_AUDIT_ACTIONS.TERMINATED,
      beforeStatus: tenant.status,
      afterStatus: "TERMINATED",
      metadata: {
        terminationReason: input.reason,
        stripeBilling: "END_AT_PERIOD",
        sceAccess: "IMMEDIATE",
      },
    });

    return {
      ok: true,
      outcome: "applied",
      previousStatus: tenant.status,
      newStatus: "TERMINATED",
      tenant: toSnapshot(updated),
    };
  } catch (error) {
    console.error("Tenant terminate: local persist failed after Stripe step", {
      tenantId: input.tenantId,
      error,
    });
    return {
      ok: false,
      code: "LOCAL_PERSIST_FAILED",
      message: PARTIAL_FAILURE_MESSAGE,
      reconciliationRequired: true,
    };
  }
}

export function throwIfLifecycleFailure(result: LifecycleCommandResult): void {
  if (result.ok) {
    return;
  }
  throw new TenantLifecycleError(result.code, result.message, result.reconciliationRequired);
}
