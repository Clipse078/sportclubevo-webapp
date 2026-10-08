import { createHash } from "node:crypto";
import type { ActivityChangeEntry } from "@/lib/collaboration/activity-change/types";

export function buildActivityChangeFingerprint(input: {
  domain: string;
  activityId: string;
  entries: ActivityChangeEntry[];
}): string {
  const normalized = [...input.entries]
    .sort((a, b) => a.field.localeCompare(b.field))
    .map((entry) => `${entry.field}:${entry.newValue ?? ""}:${entry.oldValue ?? ""}`)
    .join("|");
  const raw = `${input.domain}:${input.activityId}:${normalized}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}
