import type { MeetingDeletionImpact } from "@/lib/meetings/meeting-delete-service";

export function buildMeetingDeletionConfirmDescription(
  meetingTitle: string,
  impact: MeetingDeletionImpact | null,
): string {
  const lines: string[] = [
    `Die Sitzung „${meetingTitle}" wird dauerhaft entfernt — inklusive aller Sitzungs-Traktanden, Beschlüsse, Pendenzen (Sitzungsmassnahmen im Protokoll), Protokolldaten (z. B. Teilnehmerliste, Freigabe-Stimmen, Verlauf und Lebenszyklus dieser Sitzung).`,
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
    "Eigenständige Aufgaben und Dokumente, die nicht zum Sitzungsprotokoll gehören, bleiben erhalten. Sitzungseigene Pendenzen und Massnahmen werden dabei trotzdem gelöscht — das Beibehalten einzelner Aufgaben ausserhalb des Protokolls ersetzt keine Sitzungsinhalte.",
  );

  return lines.join(" ");
}