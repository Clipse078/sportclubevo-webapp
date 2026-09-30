import {
  AUTH_SECURITY_MESSAGES,
} from "@/lib/security/abuse-policy";
import type { PasswordResetTokenIssue } from "@/lib/auth/password-reset";

export function passwordResetTokenIssueMessage(
  issue: PasswordResetTokenIssue,
  isInvitation: boolean,
): string {
  if (!isInvitation) {
    return AUTH_SECURITY_MESSAGES.invalidOrExpiredToken;
  }

  switch (issue) {
    case "expired":
      return AUTH_SECURITY_MESSAGES.invitationExpired;
    case "consumed":
      return AUTH_SECURITY_MESSAGES.invitationAlreadyUsed;
    case "membership_already_active":
    case "account_inactive":
      return AUTH_SECURITY_MESSAGES.accountAlreadyActivated;
    case "cross_tenant_mismatch":
    case "invalid":
    default:
      return AUTH_SECURITY_MESSAGES.invitationInvalid;
  }
}
