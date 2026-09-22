/**
 * WORKSPACE-01 — canonical resource access level algebra (VIEW | EDIT | MANAGE).
 * Legacy WorkspaceAccessLevel values are rejected here (fail closed).
 */

import { WorkspaceAccessLevel } from "@prisma/client";

export const CANONICAL_RESOURCE_LEVELS = ["VIEW", "EDIT", "MANAGE"] as const;

export type CanonicalResourceLevel = (typeof CANONICAL_RESOURCE_LEVELS)[number];

const LEVEL_RANK: Record<CanonicalResourceLevel, number> = {
  VIEW: 1,
  EDIT: 2,
  MANAGE: 3,
};

const LEGACY_LEVELS = new Set<WorkspaceAccessLevel>([
  WorkspaceAccessLevel.DOWNLOAD,
  WorkspaceAccessLevel.UPLOAD,
  WorkspaceAccessLevel.DELETE,
  WorkspaceAccessLevel.OWNER,
]);

export class UnsupportedWorkspaceAccessLevelError extends Error {
  constructor(public readonly level: WorkspaceAccessLevel) {
    super(`Unsupported legacy or unknown Workspace access level: ${level}`);
    this.name = "UnsupportedWorkspaceAccessLevelError";
  }
}

export function isCanonicalResourceLevel(
  level: WorkspaceAccessLevel,
): level is CanonicalResourceLevel {
  if (LEGACY_LEVELS.has(level)) return false;
  return CANONICAL_RESOURCE_LEVELS.includes(level as CanonicalResourceLevel);
}

export function toCanonicalResourceLevel(
  level: WorkspaceAccessLevel,
): CanonicalResourceLevel {
  if (!isCanonicalResourceLevel(level)) {
    throw new UnsupportedWorkspaceAccessLevelError(level);
  }
  return level;
}

export function levelPermits(
  held: CanonicalResourceLevel,
  required: CanonicalResourceLevel,
): boolean {
  return LEVEL_RANK[held] >= LEVEL_RANK[required];
}

/** Intersection = weaker (minimum) of the two levels in the ordering. */
export function intersectResourceLevels(
  a: CanonicalResourceLevel,
  b: CanonicalResourceLevel,
): CanonicalResourceLevel {
  return LEVEL_RANK[a] <= LEVEL_RANK[b] ? a : b;
}

export function maxResourceLevel(
  levels: readonly CanonicalResourceLevel[],
): CanonicalResourceLevel | null {
  if (levels.length === 0) return null;
  return levels.reduce((best, cur) =>
    LEVEL_RANK[cur] > LEVEL_RANK[best] ? cur : best,
  );
}

export function minResourceLevel(
  levels: readonly CanonicalResourceLevel[],
): CanonicalResourceLevel | null {
  if (levels.length === 0) return null;
  return levels.reduce((best, cur) =>
    LEVEL_RANK[cur] < LEVEL_RANK[best] ? cur : best,
  );
}
