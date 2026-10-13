export function resolveTrainingGovernanceStatusLabel(lifecycleState: string): string {
  switch (lifecycleState) {
    case "PENDING_APPROVAL":
      return "Zur Freigabe";
    case "CHANGES_REQUESTED":
      return "Änderungen angefordert";
    case "REJECTED":
      return "Abgelehnt";
    case "PUBLISHED":
      return "Veröffentlicht";
    case "DRAFT":
    default:
      return "Entwurf";
  }
}
