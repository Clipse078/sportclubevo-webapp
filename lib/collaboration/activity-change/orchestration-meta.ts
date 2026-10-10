/**
 * SCE-COLLAB-01A — persisted metadata on PlatformCommunication drafts (COMM-10 compatible).
 */

import type { EventParticipationAnchorRef } from "@/lib/communication/event/orchestration-meta";

export type ActivityChangeOrchestrationMeta = {
  collaborationOrigin: "ACTIVITY_CHANGE";
  activityDomain: "TRAINING" | "MATCH" | "TOURNAMENT" | "CLUB_EVENT";
  activityId: string;
  changeFingerprint: string;
  eventAnchor?: EventParticipationAnchorRef | null;
  /** SCE-COLLAB-01D — grouped multi-activity batch (optional). */
  multiActivityBatch?: boolean;
  batchOperationId?: string;
  relatedActivityIds?: string[];
  relatedChangeFingerprints?: string[];
};

export function parseActivityChangeOrchestrationMeta(
  value: unknown,
): ActivityChangeOrchestrationMeta | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.collaborationOrigin !== "ACTIVITY_CHANGE") return null;
  if (typeof row.activityDomain !== "string" || typeof row.activityId !== "string") {
    return null;
  }
  if (typeof row.changeFingerprint !== "string" || !row.changeFingerprint.trim()) {
    return null;
  }
  const relatedActivityIds = Array.isArray(row.relatedActivityIds)
    ? row.relatedActivityIds.filter((id): id is string => typeof id === "string")
    : undefined;
  const relatedChangeFingerprints = Array.isArray(row.relatedChangeFingerprints)
    ? row.relatedChangeFingerprints.filter((id): id is string => typeof id === "string")
    : undefined;

  return {
    collaborationOrigin: "ACTIVITY_CHANGE",
    activityDomain: row.activityDomain as ActivityChangeOrchestrationMeta["activityDomain"],
    activityId: row.activityId,
    changeFingerprint: row.changeFingerprint.trim(),
    eventAnchor: (row.eventAnchor as EventParticipationAnchorRef | null | undefined) ?? null,
    multiActivityBatch: row.multiActivityBatch === true ? true : undefined,
    batchOperationId:
      typeof row.batchOperationId === "string" && row.batchOperationId.trim()
        ? row.batchOperationId.trim()
        : undefined,
    relatedActivityIds,
    relatedChangeFingerprints,
  };
}

export function buildActivityChangeOrchestrationMeta(input: {
  activityDomain: ActivityChangeOrchestrationMeta["activityDomain"];
  activityId: string;
  changeFingerprint: string;
  eventAnchor?: EventParticipationAnchorRef | null;
  multiActivityBatch?: boolean;
  batchOperationId?: string;
  relatedActivityIds?: string[];
  relatedChangeFingerprints?: string[];
}): ActivityChangeOrchestrationMeta {
  return {
    collaborationOrigin: "ACTIVITY_CHANGE",
    activityDomain: input.activityDomain,
    activityId: input.activityId.trim(),
    changeFingerprint: input.changeFingerprint.trim(),
    eventAnchor: input.eventAnchor ?? null,
    multiActivityBatch: input.multiActivityBatch ? true : undefined,
    batchOperationId: input.batchOperationId?.trim() || undefined,
    relatedActivityIds: input.relatedActivityIds?.length ? input.relatedActivityIds : undefined,
    relatedChangeFingerprints: input.relatedChangeFingerprints?.length
      ? input.relatedChangeFingerprints
      : undefined,
  };
}
