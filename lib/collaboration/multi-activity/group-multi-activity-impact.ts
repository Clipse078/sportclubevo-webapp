/**
 * SCE-COLLAB-01D — deterministic grouping of atomic impacts from one batch mutation.
 */

import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { buildMultiActivityBatchFingerprint } from "@/lib/collaboration/multi-activity/batch-fingerprint";
import type {
  MultiActivityChangeImpact,
  MultiActivityChangeImpactItem,
  MultiActivityChangeSet,
  MultiActivityDispatchStrategy,
} from "@/lib/collaboration/multi-activity/types";

export function resolveMultiActivityDispatchStrategy(
  items: MultiActivityChangeImpactItem[],
): MultiActivityDispatchStrategy {
  if (items.length <= 1) return "COMBINED";

  const domains = new Set(items.map((item) => item.impact.changeSet?.domain).filter(Boolean));
  if (domains.size > 1) return "SEPARATE_REQUIRED";

  const teamIds = new Set(
    items
      .map((item) => item.impact.audience?.teamId ?? item.impact.audience?.teamIds?.[0])
      .filter(Boolean),
  );
  if (teamIds.size > 1) return "SEPARATE_REQUIRED";

  const communicateFlags = new Set(items.map((item) => item.impact.canCommunicate));
  if (communicateFlags.size > 1) return "SEPARATE_REQUIRED";

  return "COMBINED";
}

export function buildMultiActivityChangeImpact(input: {
  batchOperationId: string;
  items: MultiActivityChangeImpactItem[];
  audience: MultiActivityChangeImpact["audience"];
  canCommunicate: boolean;
}): MultiActivityChangeImpact | null {
  const worthyItems = input.items.filter(
    (item) => item.impact.worthy && item.impact.changeSet,
  );
  if (worthyItems.length === 0) return null;

  const changeSets = worthyItems
    .map((item) => item.impact.changeSet)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const domain = changeSets[0]!.domain;
  const dispatchStrategy = resolveMultiActivityDispatchStrategy(worthyItems);
  const batchFingerprint = buildMultiActivityBatchFingerprint(changeSets);

  const canCommunicate =
    input.canCommunicate &&
    dispatchStrategy === "COMBINED" &&
    worthyItems.every((item) => item.impact.canCommunicate);

  return {
    worthy: true,
    batchOperationId: input.batchOperationId,
    domain,
    dispatchStrategy,
    activityCount: worthyItems.length,
    items: worthyItems,
    audience: input.audience,
    canCommunicate,
    batchFingerprint,
  };
}

export function mergeAtomicImpactsIntoItems(
  impacts: Array<{ activityId: string; impact: ActivityChangeImpact | null }>,
): MultiActivityChangeImpactItem[] {
  return impacts
    .filter((row): row is { activityId: string; impact: ActivityChangeImpact } =>
      Boolean(row.impact?.worthy && row.impact.changeSet),
    )
    .map((row) => ({ activityId: row.activityId, impact: row.impact }));
}

export function buildMultiActivityChangeSetFromImpact(
  impact: MultiActivityChangeImpact,
): MultiActivityChangeSet | null {
  if (!impact.worthy || !impact.batchFingerprint || impact.dispatchStrategy !== "COMBINED") {
    return null;
  }
  const teamId = impact.audience?.teamId;
  if (!teamId) return null;

  const changeSets = impact.items
    .map((item) => item.impact.changeSet)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (changeSets.length === 0) return null;

  return {
    domain: impact.domain,
    batchOperationId: impact.batchOperationId,
    teamId,
    changeSets,
    batchFingerprint: impact.batchFingerprint,
  };
}
