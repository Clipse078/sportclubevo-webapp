import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";

export function extractCollaborationImpact(payload: unknown): ActivityChangeImpact | null {
  if (!payload || typeof payload !== "object") return null;
  const collaboration = (payload as { collaboration?: ActivityChangeImpact | null }).collaboration;
  if (!collaboration?.worthy || !collaboration.changeSet) return null;
  return collaboration;
}
