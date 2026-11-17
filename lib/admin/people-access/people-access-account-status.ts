import type { TenantUserItem } from "@/lib/users/queries";

export type PeopleAccessAccountStatusTone = "success" | "warning" | "muted";

export type PeopleAccessAccountStatus = {
  label: string;
  tone: PeopleAccessAccountStatusTone;
  /** True only when login + membership are active — not equivalent to module access. */
  loginActive: boolean;
};

export function resolvePeopleAccessAccountStatus(user: TenantUserItem): PeopleAccessAccountStatus {
  const loginActive = user.membershipIsActive && user.userIsActive;
  if (user.pendingInvitation) {
    return { label: "Einladung ausstehend", tone: "warning", loginActive: false };
  }
  if (loginActive) {
    return { label: "Konto aktiv", tone: "success", loginActive: true };
  }
  return { label: "Konto deaktiviert", tone: "muted", loginActive: false };
}