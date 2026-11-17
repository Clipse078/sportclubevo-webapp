/**
 * Personalized VL invitation email preview for the standard People & Access wizard.
 */

import { buildVlInvitationEmailContent } from "@/lib/admin/vl-onboarding/vl-invitation-email-content";
import { INVITATION_PREVIEW_SAMPLE_ACCEPT_URL } from "@/lib/email/templates/invitation-preview-samples";
import type { InvitationEmailVariant } from "@/lib/email/templates/invitation";

export type VlStandardInvitePersonalizedPreviewInput = {
  tenantId: string;
  recipientEmail: string;
  recipientFirstName: string;
  actorUserId?: string;
  variant?: InvitationEmailVariant;
};

export async function buildVlStandardInvitePersonalizedEmailPreview(
  input: VlStandardInvitePersonalizedPreviewInput,
) {
  const content = await buildVlInvitationEmailContent({
    tenantId: input.tenantId,
    recipientEmail: input.recipientEmail.trim().toLowerCase(),
    recipientFirstName: input.recipientFirstName.trim() || "…",
    inviteUrlOverride: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
    actorUserId: input.actorUserId,
    variant: input.variant,
  });

  return {
    preview: true as const,
    variant: content.variant,
    subject: content.subject,
    html: content.html,
    text: content.text,
    sampleAcceptUrl: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
    disclaimer:
      "Personalisierte Vorschau — der Link ist inert (kein gültiges Einladungs-Token). Der Versand nutzt dieselbe Vorlage mit echtem Token.",
  };
}