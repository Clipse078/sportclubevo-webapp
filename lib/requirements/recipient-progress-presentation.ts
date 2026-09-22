/**
 * AUFGABEN-06G8 — RequirementRecipient management presentation (derived from canonical state).
 */

import type { RequirementResolutionStatus, RequirementStatus } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import { CircleCheck, CircleDashed, ClockAlert, UserX } from "lucide-react";
import { isRequirementRecipientOverdue } from "./requirement-deadlines";

export type RequirementRecipientManagementStatus =
  | "OPEN"
  | "OVERDUE"
  | "COMPLETED"
  | "REMOVED";

export type RequirementRecipientStatusPresentation = {
  status: RequirementRecipientManagementStatus;
  label: string;
  icon: LucideIcon;
  iconClassName: string;
  textClassName: string;
};

export function resolveRequirementRecipientManagementStatus(input: {
  requirementStatus: RequirementStatus;
  dueAt: Date | null;
  resolutionStatus: RequirementResolutionStatus;
  removedAt: Date | null;
  now?: Date;
}): RequirementRecipientManagementStatus {
  if (input.removedAt !== null) return "REMOVED";
  if (input.resolutionStatus === "RESOLVED") return "COMPLETED";
  if (
    isRequirementRecipientOverdue({
      requirementStatus: input.requirementStatus,
      dueAt: input.dueAt,
      recipientResolutionStatus: input.resolutionStatus,
      recipientRemovedAt: input.removedAt,
      now: input.now,
    })
  ) {
    return "OVERDUE";
  }
  return "OPEN";
}

export function requirementRecipientStatusPresentation(
  status: RequirementRecipientManagementStatus,
): RequirementRecipientStatusPresentation {
  switch (status) {
    case "COMPLETED":
      return {
        status,
        label: "Erledigt",
        icon: CircleCheck,
        iconClassName: "text-emerald-500",
        textClassName: "text-emerald-700 dark:text-emerald-300",
      };
    case "OVERDUE":
      return {
        status,
        label: "Überfällig",
        icon: ClockAlert,
        iconClassName: "text-red-500",
        textClassName: "text-red-700 dark:text-red-300",
      };
    case "REMOVED":
      return {
        status,
        label: "Entfernt",
        icon: UserX,
        iconClassName: "text-[var(--muted)]",
        textClassName: "text-[var(--muted)]",
      };
    case "OPEN":
    default:
      return {
        status,
        label: "Offen",
        icon: CircleDashed,
        iconClassName: "text-sky-500",
        textClassName: "text-[var(--text-2)]",
      };
  }
}

export type RequirementRecipientMatrixSort =
  | "ATTENTION"
  | "PERSON_ASC"
  | "STATUS"
  | "COMPLETED_DESC";

function managementStatusSortRank(status: RequirementRecipientManagementStatus): number {
  switch (status) {
    case "OVERDUE":
      return 0;
    case "OPEN":
      return 1;
    case "COMPLETED":
      return 2;
    case "REMOVED":
      return 3;
    default:
      return 4;
  }
}

export type RequirementRecipientSortableRow = {
  subjectDisplayName: string;
  managementStatus: RequirementRecipientManagementStatus;
  respondedAt: string | null;
};

export function sortRequirementRecipientMatrixRows<T extends RequirementRecipientSortableRow>(
  rows: readonly T[],
  sort: RequirementRecipientMatrixSort,
): T[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case "PERSON_ASC":
        return a.subjectDisplayName.localeCompare(b.subjectDisplayName, "de");
      case "STATUS": {
        const rank = managementStatusSortRank(a.managementStatus) - managementStatusSortRank(b.managementStatus);
        if (rank !== 0) return rank;
        return a.subjectDisplayName.localeCompare(b.subjectDisplayName, "de");
      }
      case "COMPLETED_DESC": {
        const ta = a.respondedAt ? Date.parse(a.respondedAt) : 0;
        const tb = b.respondedAt ? Date.parse(b.respondedAt) : 0;
        if (ta !== tb) return tb - ta;
        return a.subjectDisplayName.localeCompare(b.subjectDisplayName, "de");
      }
      case "ATTENTION":
      default: {
        const rank = managementStatusSortRank(a.managementStatus) - managementStatusSortRank(b.managementStatus);
        if (rank !== 0) return rank;
        return a.subjectDisplayName.localeCompare(b.subjectDisplayName, "de");
      }
    }
  });
  return copy;
}

export function formatRequirementResponderLabel(actorDisplayName: string | null): string | null {
  if (!actorDisplayName?.trim()) return null;
  return `Beantwortet von ${actorDisplayName.trim()}`;
}
