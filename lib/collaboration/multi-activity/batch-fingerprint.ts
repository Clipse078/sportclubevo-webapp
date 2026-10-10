import { createHash } from "node:crypto";
import type { ActivityChangeSet } from "@/lib/collaboration/activity-change/types";

export function buildMultiActivityBatchFingerprint(changeSets: ActivityChangeSet[]): string {
  const normalized = [...changeSets]
    .sort((a, b) => a.activityId.localeCompare(b.activityId))
    .map((row) => `${row.activityId}:${row.fingerprint}`)
    .join("|");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}
