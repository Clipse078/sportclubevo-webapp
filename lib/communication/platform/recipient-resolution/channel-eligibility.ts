/**
 * SCE-COMM-03 — Stage F: channel reachability seam (no delivery).
 */

import { prisma } from "@/lib/db/prisma";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import { DEFAULT_CATEGORY_CHANNEL_ELIGIBILITY } from "@/lib/communication/platform/preference-categories";

export type PersonChannelProfile = {
  personId: string;
  userId: string | null;
  email: string | null;
  isActive: boolean;
};

export async function loadPersonChannelProfiles(
  tenantId: string,
  personIds: readonly string[],
): Promise<Map<string, PersonChannelProfile>> {
  if (personIds.length === 0) return new Map();
  const rows = await prisma.person.findMany({
    where: { tenantId, id: { in: [...personIds] } },
    select: { id: true, userId: true, email: true, isActive: true },
  });
  return new Map(
    rows.map((r) => [
      r.id,
      { personId: r.id, userId: r.userId, email: r.email, isActive: r.isActive },
    ]),
  );
}

export function isPersonEligibleForChannel(input: {
  profile: PersonChannelProfile | undefined;
  channel: CommunicationChannel;
  category: CommunicationPreferenceCategory;
}): boolean {
  const allowedChannels = DEFAULT_CATEGORY_CHANNEL_ELIGIBILITY[input.category];
  if (!allowedChannels.includes(input.channel)) return false;
  if (!input.profile || !input.profile.isActive) return false;

  switch (input.channel) {
    case "IN_APP":
      return Boolean(input.profile.userId);
    case "EMAIL":
      return Boolean(input.profile.email?.trim());
    case "PUSH":
      // Device token infrastructure belongs to COMM-09 — seam defaults to linked user account.
      return Boolean(input.profile.userId);
    default:
      return false;
  }
}
