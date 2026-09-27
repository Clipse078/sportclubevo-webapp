import { prisma } from "@/lib/db/prisma";
import type { PlatformCommunicationRecipientKind } from "@prisma/client";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import {
  evaluateCommunicationDeliveryPreferenceForSponsorContact,
  evaluateCommunicationDeliveryPreferenceForUser,
} from "@/lib/communication/preferences/delivery-preference-resolver";
import {
  EXTERNAL_EMAIL_DELIVERY_CANDIDATE,
  type ExternalSnapshotDeliveryCapability,
} from "@/lib/communication/platform-email/delivery-capability";
import { isEligibleEmailAddress, normalizeEmailAddress } from "@/lib/communication/platform-email/email-address";

export type RecipientEmailEligibilitySkipReason =
  | "EMAIL_CHANNEL_DISABLED"
  | "PREFERENCE_SEAM_BLOCKED"
  | "PREFERENCE_EXPLICITLY_DISABLED"
  | "CONSENT_REQUIRED"
  | "MISSING_EMAIL"
  | "INVALID_EMAIL"
  | "EXTERNAL_NOT_CANDIDATE"
  | "INTERNAL_NO_CHANNEL"
  | "TENANT_MISMATCH";

export type RecipientEmailEligibility = {
  eligible: boolean;
  email: string | null;
  skipReason: RecipientEmailEligibilitySkipReason | null;
};

type SnapshotShape = {
  tenantId: string;
  recipientKind: PlatformCommunicationRecipientKind;
  subjectPersonId: string | null;
  sponsorContactId?: string | null;
  deliveryUserId: string | null;
  externalSnapshotJson: unknown;
  viaGuardianSubstitution?: boolean;
};

function preferenceSkipReasonFromEvaluation(reason: string): RecipientEmailEligibilitySkipReason {
  if (reason === "CONSENT_REQUIRED") return "CONSENT_REQUIRED";
  if (reason === "EXPLICITLY_DISABLED") return "PREFERENCE_EXPLICITLY_DISABLED";
  return "PREFERENCE_SEAM_BLOCKED";
}

function externalCapability(
  json: unknown,
): ExternalSnapshotDeliveryCapability | null {
  if (!json || typeof json !== "object") return null;
  const capability = (json as { deliveryCapability?: unknown }).deliveryCapability;
  return typeof capability === "string"
    ? (capability as ExternalSnapshotDeliveryCapability)
    : null;
}

export async function resolveRecipientSnapshotEmailEligibility(input: {
  tenantId: string;
  snapshot: SnapshotShape;
  emailChannelEnabled: boolean;
  category?: CommunicationPreferenceCategory;
}): Promise<RecipientEmailEligibility> {
  if (input.snapshot.tenantId !== input.tenantId) {
    return { eligible: false, email: null, skipReason: "TENANT_MISMATCH" };
  }

  if (!input.emailChannelEnabled) {
    return { eligible: false, email: null, skipReason: "EMAIL_CHANNEL_DISABLED" };
  }

  const emailCategory =
    input.snapshot.recipientKind === "EXTERNAL_SPONSOR_CONTACT"
      ? "SPONSOR_COMMERCIAL"
      : (input.category ?? "CLUB_INFORMATION");

  if (input.snapshot.recipientKind === "INTERNAL_PERSON_NO_CHANNEL") {
    const personId = input.snapshot.subjectPersonId;
    if (!personId) {
      return { eligible: false, email: null, skipReason: "INTERNAL_NO_CHANNEL" };
    }
    const person = await prisma.person.findFirst({
      where: { id: personId, tenantId: input.tenantId },
      select: { email: true },
    });
    const email = normalizeEmailAddress(person?.email);
    if (!email) {
      return { eligible: false, email: null, skipReason: "MISSING_EMAIL" };
    }
    return { eligible: true, email, skipReason: null };
  }

  if (input.snapshot.recipientKind === "EXTERNAL_SPONSOR_CONTACT") {
    const sponsorContactId = input.snapshot.sponsorContactId?.trim();
    if (sponsorContactId) {
      const preference = await evaluateCommunicationDeliveryPreferenceForSponsorContact({
        tenantId: input.tenantId,
        sponsorContactId,
        category: "SPONSOR_COMMERCIAL",
        channel: "EMAIL",
      });
      if (!preference.allowed) {
        return {
          eligible: false,
          email: null,
          skipReason: preferenceSkipReasonFromEvaluation(preference.reason),
        };
      }
    }
    const capability = externalCapability(input.snapshot.externalSnapshotJson);
    if (capability !== EXTERNAL_EMAIL_DELIVERY_CANDIDATE) {
      return { eligible: false, email: null, skipReason: "EXTERNAL_NOT_CANDIDATE" };
    }
    const rawEmail =
      input.snapshot.externalSnapshotJson &&
      typeof input.snapshot.externalSnapshotJson === "object"
        ? (input.snapshot.externalSnapshotJson as { email?: unknown }).email
        : null;
    const email = normalizeEmailAddress(typeof rawEmail === "string" ? rawEmail : null);
    if (!email) {
      return { eligible: false, email: null, skipReason: "MISSING_EMAIL" };
    }
    return { eligible: true, email, skipReason: null };
  }

  const deliveryUserId = input.snapshot.deliveryUserId?.trim();
  if (!deliveryUserId) {
    return { eligible: false, email: null, skipReason: "MISSING_EMAIL" };
  }

  const preference = await evaluateCommunicationDeliveryPreferenceForUser({
    tenantId: input.tenantId,
    userId: deliveryUserId,
    category: emailCategory,
    channel: "EMAIL",
  });
  if (!preference.allowed) {
    return {
      eligible: false,
      email: null,
      skipReason: preferenceSkipReasonFromEvaluation(preference.reason),
    };
  }

  const user = await prisma.user.findFirst({
    where: { id: deliveryUserId, tenantId: input.tenantId, isActive: true },
    select: { email: true },
  });
  let email = normalizeEmailAddress(user?.email);
  if (
    !email &&
    input.snapshot.subjectPersonId &&
    !input.snapshot.viaGuardianSubstitution
  ) {
    const person = await prisma.person.findFirst({
      where: { id: input.snapshot.subjectPersonId, tenantId: input.tenantId },
      select: { email: true },
    });
    email = normalizeEmailAddress(person?.email);
  }

  if (!email) {
    return { eligible: false, email: null, skipReason: "MISSING_EMAIL" };
  }
  if (!isEligibleEmailAddress(email)) {
    return { eligible: false, email: null, skipReason: "INVALID_EMAIL" };
  }

  return { eligible: true, email, skipReason: null };
}
