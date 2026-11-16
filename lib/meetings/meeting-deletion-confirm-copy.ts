import type { MeetingDeletionImpact } from "@/lib/meetings/meeting-delete-service";

export function buildMeetingDeletionConfirmDescription(
  meetingTitle: string,
  impact: MeetingDeletionImpact | null,
): string {
  const lines: string[] = [
    `Die Sitzung „${meetingTitle}" wird dauerhaft entfernt — inklusive Teilnehmerliste, Traktanden, Beschlüssen, Pendenzen (Sitzungsmassnahmen), Freigabe-Stimmen und Lebenszyklus-Einträgen zu dieser Sitzung.`,
  ];

  if (impact) {
    const detail: string[] = [];
    if (impact.participants > 0) {
      detail.push(`${impact.participants} Teilnehmer`);
    }
    if (impact.agendaItems > 0) {
      detail.push(`${impact.agendaItems} Traktanden`);
    }
    if (impact.decisions > 0) {
      detail.push(`${impact.decisions} Beschlüsse`);
    }
    if (impact.actions > 0) {
      detail.push(`${impact.actions} Pendenzen`);
    }
    if (detail.length > 0) {
      lines.push(`Betroffen: ${detail.join(", ")}.`);
    }
  }

  lines.push(
    "Eigenständige Aufgaben und Dokumente ausserhalb des Sitzungsprotokolls bleiben erhalten; ein Aufgaben-Kontext (Sitzung) kann danach nicht mehr aufgelöst werden.",
  );

  return lines.join(" ");
}