/**
 * SCE-COMM-EVO-06 — preview authorization (no cross-tenant / out-of-scope persons).
 */

import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import { prisma } from "@/lib/db/prisma";

export async function assertPersonalisationPreviewRecipientAuthorized(input: {
  tenantId: string;
  senderUserId: string;
  audience: CommunicationAudienceSpec;
  contextRef: CommunicationContextRef;
  category: CommunicationPreferenceCategory;
  subjectPersonId: string;
  deliveryUserId?: string | null;
}): Promise<void> {
  const resolution = await resolveCommunicationRecipients({
    tenantId: input.tenantId,
    senderActor: { userId: input.senderUserId },
    audience: input.audience,
    context: input.contextRef,
    channel: "IN_APP",
    category: input.category,
    mode: "PREVIEW",
  });

  if (!resolution.effectiveRecipientPersonIds.includes(input.subjectPersonId)) {
    throw new Error("Empfänger liegt ausserhalb des autorisierten Vorschau-Bereichs.");
  }

  if (input.deliveryUserId) {
    const user = await prisma.user.findFirst({
      where: { id: input.deliveryUserId, tenantId: input.tenantId },
      select: { id: true },
    });
    if (!user) {
      throw new Error("Zustellbenutzer ungültig.");
    }
  }
}
