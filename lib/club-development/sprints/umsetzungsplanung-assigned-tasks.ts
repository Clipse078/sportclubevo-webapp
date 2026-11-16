import type { TaskStatus } from "@prisma/client";
import type { SprintBoardCard } from "./sprint-board";

export type UmsetzungsplanungAssignedInitiativeGroup = {
  initiativeId: string | null;
  initiativeLabel: string;
  byStatus: UmsetzungsplanungAssignedStatusGroup[];
};

export type UmsetzungsplanungAssignedStatusGroup = {
  status: TaskStatus;
  statusLabel: string;
  tasks: SprintBoardCard[];
};

const STATUS_ORDER: TaskStatus[] = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"];

export function groupAssignedSprintBoardCards(
  cards: SprintBoardCard[],
  statusLabels: Record<TaskStatus, string>,
): UmsetzungsplanungAssignedInitiativeGroup[] {
  const byInitiative = new Map<string, SprintBoardCard[]>();
  const ohneKey = "__ohne_vorhaben__";

  for (const card of cards) {
    const key = card.initiativeId ?? ohneKey;
    const bucket = byInitiative.get(key) ?? [];
    bucket.push(card);
    byInitiative.set(key, bucket);
  }

  const groups: UmsetzungsplanungAssignedInitiativeGroup[] = [];

  for (const [key, initiativeCards] of byInitiative) {
    const initiativeId = key === ohneKey ? null : key;
    const initiativeLabel =
      initiativeId === null
        ? "Ohne Vorhaben"
        : initiativeCards[0]?.initiativeLabel?.trim() || "Vorhaben";

    const byStatusMap = new Map<TaskStatus, SprintBoardCard[]>();
    for (const card of initiativeCards) {
      const statusBucket = byStatusMap.get(card.status) ?? [];
      statusBucket.push(card);
      byStatusMap.set(card.status, statusBucket);
    }

    const byStatus: UmsetzungsplanungAssignedStatusGroup[] = [];
    for (const status of STATUS_ORDER) {
      const tasks = byStatusMap.get(status);
      if (!tasks?.length) continue;
      tasks.sort((a, b) => a.title.localeCompare(b.title, "de"));
      byStatus.push({
        status,
        statusLabel: statusLabels[status] ?? status,
        tasks,
      });
    }

    groups.push({ initiativeId, initiativeLabel, byStatus });
  }

  groups.sort((a, b) => {
    if (a.initiativeId === null) return 1;
    if (b.initiativeId === null) return -1;
    return a.initiativeLabel.localeCompare(b.initiativeLabel, "de");
  });

  return groups;
}