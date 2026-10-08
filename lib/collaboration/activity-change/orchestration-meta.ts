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
  return {
    collaborationOrigin: "ACTIVITY_CHANGE",
    activityDomain: row.activityDomain as ActivityChangeOrchestrationMeta["activityDomain"],
    activityId: row.activityId,
    changeFingerprint: row.changeFingerprint.trim(),
    eventAnchor: (row.eventAnchor as EventParticipationAnchorRef | null | undefined) ?? null,
  };
}

export function buildActivityChangeOrchestrationMeta(input: {
  activityDomain: ActivityChangeOrchestrationMeta["activityDomain"];
  activityId: string;
  changeFingerprint: string;
  eventAnchor?: EventParticipationAnchorRef | null;
}): ActivityChangeOrchestrationMeta {
  return {
    collaborationOrigin: "ACTIVITY_CHANGE",
    activityDomain: input.activityDomain,
    activityId: input.activityId.trim(),
    changeFingerprint: input.changeFingerprint.trim(),
    eventAnchor: input.eventAnchor ?? null,
  };
}
