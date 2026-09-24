import { TaskStatus } from "@prisma/client";
import { getPersonalTaskUrgencyBucket } from "@/lib/tasks/personal-ordering";
import { mapPersonalActionToListItem } from "@/lib/personal-actions/presentation";
import type { PersonalAction } from "@/lib/personal-actions/types";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { PersonalAttentionItem, PersonalAttentionUrgency } from "./types";

function resolveUrgency(
  action: PersonalAction,
  emphasis: "calm" | "attention" | "urgent",
  now: Date,
): PersonalAttentionUrgency {
  if (action.sourceType === "TASK" && action.dueAt) {
    const bucket = getPersonalTaskUrgencyBucket(
      {
        id: action.id,
        dueAt: action.dueAt,
        status: TaskStatus.OPEN,
        createdAt: action.createdAt ?? new Date(0).toISOString(),
        priority: action.priority ?? "NORMAL",
      },
      now,
    );
    if (bucket === 0) return "overdue";
    if (bucket === 1) return "due_today";
    if (bucket === 2) return "due_soon";
  }

  if (emphasis === "urgent") return "overdue";
  if (emphasis === "attention") return "due_soon";
  return "action_required";
}

export function mapPersonalActionToAttentionItem(
  action: PersonalAction,
  cfg: TenantFormatConfig,
  locale: string,
  timeZone: string,
  now: Date = new Date(),
): PersonalAttentionItem | null {
  const listItem = mapPersonalActionToListItem(action, cfg, locale, timeZone);
  const href = listItem.href ?? action.href;
  if (!href) {
    return null;
  }

  const urgency = resolveUrgency(action, listItem.emphasis, now);

  return {
    id: listItem.id,
    sourceType: action.sourceType,
    title: listItem.title,
    summary: listItem.subtitle,
    dueAt: action.dueAt,
    urgency,
    contextLabel: action.context?.teamDisplayName?.trim() ?? null,
    deepLink: href,
    actionLabel: null,
    presentationStatus: listItem.metaLine,
    urgent: listItem.emphasis === "urgent" || urgency === "overdue",
  };
}

export function mapPersonalActionsToAttentionItems(
  actions: PersonalAction[],
  cfg: TenantFormatConfig,
  locale: string,
  timeZone: string,
  now: Date = new Date(),
): PersonalAttentionItem[] {
  const items: PersonalAttentionItem[] = [];
  for (const action of actions) {
    const mapped = mapPersonalActionToAttentionItem(action, cfg, locale, timeZone, now);
    if (mapped) {
      items.push(mapped);
    }
  }
  return items;
}
