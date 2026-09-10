import type {
  TenantLifecycleActionSource,
  TenantStatus,
  TenantSuspensionReason,
  TenantTerminationReason,
} from "@prisma/client";

export const TENANT_LIFECYCLE_AUDIT_MODULE = "billing";

export const TENANT_LIFECYCLE_AUDIT_ACTIONS = {
  SUSPENDED: "TENANT_LIFECYCLE_SUSPENDED",
  REACTIVATED: "TENANT_LIFECYCLE_REACTIVATED",
  TERMINATED: "TENANT_LIFECYCLE_TERMINATED",
} as const;

export type SuspensionBillingBehavior = "KEEP_BILLING" | "SCHEDULE_CANCELLATION";

export type TenantLifecycleSnapshot = {
  tenantId: string;
  tenantKey: string;
  tenantName: string;
  status: TenantStatus;
  suspendedAt: string | null;
  suspensionReason: TenantSuspensionReason | null;
  suspensionReasonNote: string | null;
  suspensionActionSource: TenantLifecycleActionSource | null;
  reactivatedAt: string | null;
  terminatedAt: string | null;
  terminationReason: TenantTerminationReason | null;
  terminationReasonNote: string | null;
};

export type LifecycleMutationOutcome =
  | "applied"
  | "already_suspended"
  | "already_active"
  | "already_terminated";

export type LifecycleCommandSuccess = {
  ok: true;
  outcome: LifecycleMutationOutcome;
  previousStatus: TenantStatus;
  newStatus: TenantStatus;
  tenant: TenantLifecycleSnapshot;
  stripeWarning?: string;
};

export type LifecycleCommandFailure = {
  ok: false;
  code:
    | "TENANT_NOT_FOUND"
    | "INVALID_TRANSITION"
    | "STRIPE_FAILED"
    | "LOCAL_PERSIST_FAILED"
    | "NO_SUBSCRIPTION_FOR_BILLING_ACTION";
  message: string;
  reconciliationRequired?: boolean;
};

export type LifecycleCommandResult = LifecycleCommandSuccess | LifecycleCommandFailure;

export class TenantLifecycleError extends Error {
  constructor(
    public readonly code: LifecycleCommandFailure["code"],
    message: string,
    public readonly reconciliationRequired?: boolean,
  ) {
    super(message);
    this.name = "TenantLifecycleError";
  }
}
