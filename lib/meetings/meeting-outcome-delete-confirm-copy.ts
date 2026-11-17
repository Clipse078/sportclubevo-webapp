import type { MeetingDecisionDeletionImpact, MeetingActionDeletionImpact } from "@/lib/meetings/meeting-outcome-delete-service";

export function buildMeetingDecisionDeletionConfirmDescription(
  title: string,
  impact: MeetingDecisionDeletionImpact | null,
): string {
  const parts = [
    `Der Beschluss «${title}» wird aus dem Protokoll entfernt.`,
    "Verknüpfte Pendenzen und Aufgaben bleiben erhalten; die Verknüpfung zum Beschluss entfällt.",
  ];
  if (impact) {
    if (impact.linkedPendenzCount > 0) {
      parts.push(
        `${impact.linkedPendenzCount} Pendenz${impact.linkedPendenzCount === 1 ? "" : "en"} bleibt mit Traktandumbezug.`,
      );
    }
    if (impact.linkedTaskCount > 0) {
      parts.push(
        `${impact.linkedTaskCount} Aufgabe${impact.linkedTaskCount === 1 ? "" : "n"} bleibt mit Sitzungs-/Traktandumbezug.`,
      );
    }
  }
  parts.push("Die Aktion lässt sich nicht rückgängig machen.");
  return parts.join(" ");
}

export function buildMeetingActionDeletionConfirmDescription(
  title: string,
  impact: MeetingActionDeletionImpact | null,
): string {
  const parts = [
    `Die Pendenz «${title}» wird aus dem Protokoll entfernt.`,
    "Verknüpfte Beschlüsse und Aufgaben im Aufgaben-Center werden nicht gelöscht.",
  ];
  if (impact?.linkedDecisionTitle) {
    parts.push(`Bezug Beschluss «${impact.linkedDecisionTitle}» bleibt ansonsten unverändert.`);
  }
  parts.push("Die Aktion lässt sich nicht rückgängig machen.");
  return parts.join(" ");
}