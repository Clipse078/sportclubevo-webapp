/**
 * SCE-COLLAB-01B — participant-facing match status labels (de).
 */

export function displayMatchCollaborationStatus(status: string): string {
  const normalized = status.trim().toUpperCase();
  switch (normalized) {
    case "CANCELLED":
    case "CANCELED":
      return "Abgesagt";
    case "POSTPONED":
      return "Verschoben";
    case "SCHEDULED":
      return "Geplant";
    case "LIVE":
      return "Live";
    case "COMPLETED":
      return "Abgeschlossen";
    default:
      return status;
  }
}
