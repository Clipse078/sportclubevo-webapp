/**
 * Unified account / invitation status for Personen & Zugänge detail UX.
 * Avoids contradictory labels (e.g. pending invite + "Zugriff gesperrt").
 */

export type PersonAccessStatusTone = "success" | "warning" | "muted";

export type PersonAccessStatus = {
  primaryLabel: string;
  tone: PersonAccessStatusTone;
  /** When true, membership deactivation UI must not show "Zugriff gesperrt" as primary state. */
  isPendingInvitation: boolean;
  /** User can sign in and use the product in this tenant. */
  isFullyActive: boolean;
};

export function resolvePersonAccessStatus(input: {
  pendingInvitation: boolean;
  membershipIsActive: boolean;
  userIsActive: boolean;
}): PersonAccessStatus {
  if (input.pendingInvitation) {
    return {
      primaryLabel: "Einladung ausstehend",
      tone: "warning",
      isPendingInvitation: true,
      isFullyActive: false,
    };
  }

  if (!input.userIsActive) {
    return {
      primaryLabel: "Konto inaktiv",
      tone: "warning",
      isPendingInvitation: false,
      isFullyActive: false,
    };
  }

  if (!input.membershipIsActive) {
    return {
      primaryLabel: "Zugriff gesperrt",
      tone: "muted",
      isPendingInvitation: false,
      isFullyActive: false,
    };
  }

  return {
    primaryLabel: "Aktiv",
    tone: "success",
    isPendingInvitation: false,
    isFullyActive: true,
  };
}
