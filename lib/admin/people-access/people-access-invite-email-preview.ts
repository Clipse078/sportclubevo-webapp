/**
 * Personalized standard (non-VL-preset) invitation email preview for Person hinzufügen.
 */

import { buildInvitationEmail, type InvitationEmailVariant } from "@/lib/email/templates/invitation";
import { INVITATION_PREVIEW_SAMPLE_ACCEPT_URL } from "@/lib/email/templates/invitation-preview-samples";
import { resolveInvitationInviterDisplayName } from "@/lib/admin/vl-onboarding/resolve-invitation-inviter-display-name";
import { prisma } from "@/lib/db/prisma";
import { resolveVlInvitationEmailVariant } from "@/lib/admin/vl-onboarding/vl-invitation-email-content";
import { INVITATION_EXPIRY_HOURS } from "@/lib/users/mutations";

export type PeopleAccessInviteEmailPreviewInput = {
  tenantId: string;
  recipientEmail: string;
  recipientFirstName: string;
  actorUserId?: string | null;
  variant?: InvitationEmailVariant;
  sceLogoAbsoluteUrl?: string;
  inviteUrl?: string;
  appBaseUrl?: string;
};

export async function buildPeopleAccessInviteEmailPreview(
  input: PeopleAccessInviteEmailPreviewInput,
): Promise<{ subject: string; html: string; text: string; variant: InvitationEmailVariant }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { name: true },
  });
  const inviterName =
    (input.actorUserId
      ? await resolveInvitationInviterDisplayName(input.actorUserId)
      : undefined) ?? "Dein Verein";

  const variant =
    input.variant ??
    (await resolveVlInvitationEmailVariant(input.recipientEmail));

  const appBaseUrl = input.appBaseUrl?.replace(/\/$/, "");
  const { subject, html, text } = buildInvitationEmail({
    inviteUrl: input.inviteUrl ?? INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
    recipientEmail: input.recipientEmail,
    recipientFirstName: input.recipientFirstName || "du",
    tenantName: tenant?.name ?? "Dein Verein",
    inviterDisplayName: inviterName,
    expiryHours: INVITATION_EXPIRY_HOURS,
    appBaseUrl: appBaseUrl || undefined,
    variant,
    sceLogoAbsoluteUrl: input.sceLogoAbsoluteUrl,
  });

  return { subject, html, text, variant };
}