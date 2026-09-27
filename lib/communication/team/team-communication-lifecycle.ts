import type { PlatformCommunicationStatus } from "@prisma/client";

const ALLOWED: Record<PlatformCommunicationStatus, readonly PlatformCommunicationStatus[]> = {
  DRAFT: ["READY", "PUBLISHED", "ARCHIVED"],
  READY: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionCommunicationStatus(
  from: PlatformCommunicationStatus,
  to: PlatformCommunicationStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

/** Published communications keep audience snapshots immutable; body edits are COMM-05+. */
export function communicationBodyMutable(status: PlatformCommunicationStatus): boolean {
  return status === "DRAFT" || status === "READY";
}

export function communicationAudienceMutable(status: PlatformCommunicationStatus): boolean {
  return status === "DRAFT" || status === "READY";
}
