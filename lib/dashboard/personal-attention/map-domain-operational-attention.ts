import type { DomainOperationalAttentionItem } from "@/lib/domain-attention/types";
import type { PersonalAttentionItem, PersonalAttentionUrgency } from "./types";

const DOMAIN_CONTEXT_LABEL: Record<string, string> = {
  spielbetrieb: "Spielbetrieb",
  training: "Training",
  events: "Veranstaltungen",
};

function mapSeverityToUrgency(severity: DomainOperationalAttentionItem["severity"]): PersonalAttentionUrgency {
  if (severity === "urgent") return "overdue";
  if (severity === "warning") return "due_soon";
  return "action_required";
}

function pickPrimaryAction(item: DomainOperationalAttentionItem) {
  return item.actions[0] ?? null;
}

export function mapDomainOperationalAttentionToPersonalItem(
  item: DomainOperationalAttentionItem,
): PersonalAttentionItem {
  const primary = pickPrimaryAction(item);
  const urgency = mapSeverityToUrgency(item.severity);

  return {
    id: item.id,
    sourceType: "DOMAIN_OPERATIONAL",
    domainKey: item.domainKey,
    title: item.title,
    summary: item.summary,
    dueAt: item.dueAt,
    urgency,
    contextLabel: DOMAIN_CONTEXT_LABEL[item.domainKey] ?? item.domainKey,
    deepLink: item.deepLink,
    actionLabel: primary?.label ?? null,
    operationalAction: primary
      ? {
          actionKey: primary.actionKey,
          executionKind: primary.executionKind,
        }
      : null,
    presentationStatus: item.count != null && item.count > 0 ? String(item.count) : null,
    urgent: item.severity === "urgent" || urgency === "overdue",
  };
}

export function mapDomainOperationalAttentionItems(
  items: DomainOperationalAttentionItem[],
): PersonalAttentionItem[] {
  return items.map(mapDomainOperationalAttentionToPersonalItem);
}
