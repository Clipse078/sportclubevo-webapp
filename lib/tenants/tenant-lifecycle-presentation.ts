import type { TenantStatus, TenantSuspensionReason } from "@prisma/client";

const SCE_ACCESS_LABELS: Record<TenantStatus, string> = {
  ACTIVE: "Aktiv",
  SUSPENDED: "Gesperrt",
  TERMINATED: "Beendet",
  ARCHIVED: "Archiviert",
};

const SUSPENSION_REASON_LABELS: Record<TenantSuspensionReason, string> = {
  NON_PAYMENT: "Zahlung ausstehend",
  ADMINISTRATIVE: "Administrativ",
  OTHER: "Sonstiges",
};

export function presentSceTenantAccessStatus(status: TenantStatus): string {
  return SCE_ACCESS_LABELS[status] ?? status;
}

export function presentSuspensionReason(
  reason: TenantSuspensionReason | null | undefined,
): string | null {
  if (!reason) {
    return null;
  }
  return SUSPENSION_REASON_LABELS[reason] ?? reason;
}

export function presentStripeSubscriptionAccessLine(input: {
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  lifecycleStatus: TenantStatus;
}): string {
  if (!input.subscriptionStatus) {
    return "Kein Abonnement verknüpft";
  }

  const normalized = input.subscriptionStatus.toLowerCase();
  if (normalized === "canceled") {
    return "Beendet — neues Abonnement erforderlich";
  }

  if (input.cancelAtPeriodEnd) {
    return "Aktiv · Kündigung zum Periodenende geplant";
  }

  if (input.lifecycleStatus === "SUSPENDED") {
    return "Aktiv · Abrechnung läuft weiter";
  }

  if (normalized === "active" || normalized === "trialing") {
    return "Aktiv";
  }

  return input.subscriptionStatus;
}
