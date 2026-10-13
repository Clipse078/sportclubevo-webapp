/** Canonical Club Event governance / review labels for management surfaces. */
export const CLUB_EVENT_GOVERNANCE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  PENDING_APPROVAL: "Zur Freigabe",
  CHANGES_REQUESTED: "Änderungen angefordert",
  REJECTED: "Abgelehnt",
  PUBLISHED: "Veröffentlicht",
};

export function resolveClubEventGovernanceStatusLabel(lifecycleState: string): string {
  return CLUB_EVENT_GOVERNANCE_STATUS_LABEL[lifecycleState] ?? lifecycleState;
}
