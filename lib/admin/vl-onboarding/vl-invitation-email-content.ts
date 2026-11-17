/**
 * Shared VL invitation email content — used by dry-run transport and live sends.
 */

import { resolveTransactionalSceEmailLogoAbsoluteUrl } from "@/lib/email/resolve-transactional-sce-email-logo-url";
import { buildInvitationEmail, type InvitationEmailVariant } from "@/lib/email/templates/invitation";
import { INVITATION_EXPIRY_HOURS } from "@/lib/users/mutations";
import { buildPasswordResetLink, resolveSecurityLinkBaseUrl } from "@/lib/server/security-link-url";
import { prisma } from "@/lib/db/prisma";
export const VL_INVITATION_ACCESS_SUMMARY = "Vereinsleitung — Vereinsentwicklung";

export type VlInvitationEmailInput = {
  tenantId: string;
  recipientEmail: string;
  recipientFirstName: string;
  rawToken?: string;
  inviteUrlOverride?: string;
  inviterDisplayName?: string;
  variant?: InvitationEmailVariant;
};

export async function resolveVlInvitationEmailVariant(
  recipientEmail: string,
): Promise<InvitationEmailVariant> {
  const existingGlobalUser = await prisma.user.findFirst({
    where: { email: { equals: recipientEmail, mode: "insensitive" }, isActive: true },
    select: { id: true, lastLoginAt: true },
  });
  if (existingGlobalUser?.lastLoginAt) {
    return "existing_account";
  }
  return existingGlobalUser ? "new_account" : "new_account";
}

export async function buildVlInvitationEmailContent(
  input: VlInvitationEmailInput,
): Promise<{ subject: string; html: string; text: string; variant: InvitationEmailVariant }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { name: true },
  });
  const tenantName = tenant?.name ?? "Ihrem Club";
  const variant =
    input.variant ?? (await resolveVlInvitationEmailVariant(input.recipientEmail));

  let inviteUrl = input.inviteUrlOverride ?? "";
  if (!inviteUrl) {
    if (!input.rawToken) {
      throw new Error("VL invitation email requires rawToken or inviteUrlOverride.");
    }
    inviteUrl = buildPasswordResetLink(input.rawToken);
  }

  let appBaseUrl: string | undefined;
  try {
    appBaseUrl = resolveSecurityLinkBaseUrl().toString().replace(/\/$/, "");
  } catch {
    appBaseUrl = undefined;
  }
  const sceLogoAbsoluteUrl = resolveTransactionalSceEmailLogoAbsoluteUrl();

  const { subject, html, text } = buildInvitationEmail({
    inviteUrl,
    recipientEmail: input.recipientEmail,
    recipientFirstName: input.recipientFirstName,
    tenantName,
    inviterDisplayName: input.inviterDisplayName,
    expiryHours: INVITATION_EXPIRY_HOURS,
    appBaseUrl,
    sceLogoAbsoluteUrl,
    variant,
    accessSummary: VL_INVITATION_ACCESS_SUMMARY,
  });

  return { subject, html, text, variant };
}