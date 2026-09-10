import type { BillingDunningStatus } from "@prisma/client";

const LABELS: Record<BillingDunningStatus, string> = {
  CURRENT: "Zahlungen aktuell",
  GRACE_PERIOD: "Zahlung ausstehend",
  SUSPENDED: "Wegen Zahlung gesperrt",
  RESOLVED: "Zahlung geklärt",
  EXEMPT: "Automatische Sperrung ausgesetzt",
  REQUIRES_REVIEW: "Prüfung erforderlich",
};

export type DunningBadgeTone = "success" | "warning" | "danger" | "muted" | "neutral";

export function presentDunningStatusLabel(status: BillingDunningStatus): string {
  return LABELS[status] ?? status;
}

export function presentDunningBadgeTone(status: BillingDunningStatus): DunningBadgeTone {
  switch (status) {
    case "CURRENT":
    case "RESOLVED":
      return "success";
    case "GRACE_PERIOD":
    case "REQUIRES_REVIEW":
      return "warning";
    case "SUSPENDED":
      return "danger";
    case "EXEMPT":
      return "neutral";
    default:
      return "muted";
  }
}

export function presentOverviewDunningPriority(
  status: BillingDunningStatus,
): "healthy" | "action_required" | "suspended" | "exempt" {
  if (status === "EXEMPT") return "exempt";
  if (status === "SUSPENDED") return "suspended";
  if (status === "GRACE_PERIOD" || status === "REQUIRES_REVIEW") return "action_required";
  return "healthy";
}
