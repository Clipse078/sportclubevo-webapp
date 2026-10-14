export function resolveMatchGovernanceStatusLabel(lifecycleState: string): string {
  switch (lifecycleState) {
    case "PENDING_APPROVAL":
      return "Freigabe ausstehend";
    case "CHANGES_REQUESTED":
      return "Änderungen angefordert";
    case "REJECTED":
      return "Abgelehnt";
    case "DRAFT":
      return "Entwurf";
    case "PUBLISHED":
      return "Veröffentlicht";
    default:
      return lifecycleState;
  }
}
