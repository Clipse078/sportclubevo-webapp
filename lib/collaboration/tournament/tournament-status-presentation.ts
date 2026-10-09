export function displayTournamentCollaborationStatus(status: string): string {
  const normalized = status.trim().toUpperCase();
  switch (normalized) {
    case "CANCELLED":
    case "CANCELED":
      return "Abgesagt";
    case "SCHEDULED":
      return "Geplant";
    default:
      return status;
  }
}
