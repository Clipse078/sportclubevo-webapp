/**
 * SCE-COLLAB-01D — deduplicated recipient union for grouped training impacts.
 */

import { eventCommunicationContext } from "@/lib/communication/platform/seams/event-communication-seam";
import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

export type MultiActivityDispatchPreview = {
  recipientCount: number;
  canDispatch: boolean;
};

/** Test hook — counts PREVIEW resolver invocations per process. */
let comm03PreviewCallCountForTests = 0;

export function resetMultiActivityDispatchPreviewCallCountForTests(): void {
  comm03PreviewCallCountForTests = 0;
}

export function getMultiActivityDispatchPreviewCallCountForTests(): number {
  return comm03PreviewCallCountForTests;
}

async function resolveTeamOperationalPreviewOnce(input: {
  tenantId: string;
  senderUserId: string;
  representativeSessionId: string;
  audience: CommunicationAudienceSpec;
}): Promise<MultiActivityDispatchPreview> {
  comm03PreviewCallCountForTests += 1;
  const resolution = await resolveCommunicationRecipients({
    tenantId: input.tenantId,
    senderActor: { userId: input.senderUserId },
    audience: input.audience,
    context: eventCommunicationContext(input.representativeSessionId),
    channel: "IN_APP",
    category: "TEAM_OPERATIONAL",
    mode: "PREVIEW",
  });
  return {
    recipientCount: resolution.summary.effectiveCount,
    canDispatch: resolution.summary.effectiveCount > 0,
  };
}

/**
 * Team-operational roster previews for the same structural audience do not
 * require per-session COMM-03 PREVIEW when building grouped training impact.
 * One representative session id is sufficient; publish still validates per activity.
 */
export async function resolveMultiActivityTrainingDispatchPreview(input: {
  tenantId: string;
  senderUserId: string;
  sessionIds: string[];
  audience: CommunicationAudienceSpec;
}): Promise<MultiActivityDispatchPreview> {
  if (input.sessionIds.length === 0) {
    return { recipientCount: 0, canDispatch: false };
  }

  try {
    return await resolveTeamOperationalPreviewOnce({
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
      representativeSessionId: input.sessionIds[0]!,
      audience: input.audience,
    });
  } catch {
    return { recipientCount: 0, canDispatch: false };
  }
}

/**
 * Resolves PREVIEW once per distinct audience spec (multi-team batches).
 */
export async function resolveMultiActivityTrainingDispatchPreviewByAudienceGroups(input: {
  tenantId: string;
  senderUserId: string;
  groups: Array<{ audienceKey: string; audience: CommunicationAudienceSpec; sessionIds: string[] }>;
}): Promise<{ recipientCount: number; canDispatch: boolean }> {
  if (input.groups.length === 0) {
    return { recipientCount: 0, canDispatch: false };
  }

  const personIdSets: string[][] = [];
  for (const group of input.groups) {
    if (group.sessionIds.length === 0) continue;
    comm03PreviewCallCountForTests += 1;
    const resolution = await resolveCommunicationRecipients({
      tenantId: input.tenantId,
      senderActor: { userId: input.senderUserId },
      audience: group.audience,
      context: eventCommunicationContext(group.sessionIds[0]!),
      channel: "IN_APP",
      category: "TEAM_OPERATIONAL",
      mode: "PREVIEW",
    });
    personIdSets.push(resolution.effectiveRecipientPersonIds);
  }

  const { unionSortedSets } = await import(
    "@/lib/communication/platform/recipient-resolution/set-algebra"
  );
  const union = unionSortedSets(personIdSets);
  return { recipientCount: union.length, canDispatch: union.length > 0 };
}
