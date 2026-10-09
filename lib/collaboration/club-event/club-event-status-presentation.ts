const CLUB_EVENT_STATUS_LABELS_DE: Record<string, string> = {
  SCHEDULED: "Geplant",
  ARCHIVED: "Archiviert",
  CANCELLED: "Abgesagt",
};

export function displayClubEventCollaborationStatus(status: string): string {
  return CLUB_EVENT_STATUS_LABELS_DE[status] ?? status;
}
