/**
 * WORKSPACE-08-07 — server-side subtree async threshold (not client-controlled).
 */

/** Default aligns with W08D ~1k node transaction / serverless risk boundary. */
export const WORKSPACE_ASYNC_SUBTREE_THRESHOLD_DEFAULT = 1000;

export const WORKSPACE_ASYNC_SUBTREE_THRESHOLD_MIN = 100;
export const WORKSPACE_ASYNC_SUBTREE_THRESHOLD_MAX = 10_000;

/** Documents + folders purged/trashed per background batch. */
export const WORKSPACE_SUBTREE_OPERATION_BATCH_SIZE = 25;

/**
 * Node count for sync vs async planning: folders in subtree (inclusive of root)
 * plus documents whose folderId lies in that subtree.
 */
export type WorkspaceSubtreeNodeCount = {
  folderCount: number;
  documentCount: number;
  totalNodes: number;
  probeLimitExceeded: boolean;
};

export function resolveWorkspaceAsyncSubtreeThreshold(): number {
  const raw = process.env.WORKSPACE_ASYNC_SUBTREE_THRESHOLD?.trim();
  if (!raw) {
    return WORKSPACE_ASYNC_SUBTREE_THRESHOLD_DEFAULT;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return WORKSPACE_ASYNC_SUBTREE_THRESHOLD_DEFAULT;
  }

  return Math.min(
    WORKSPACE_ASYNC_SUBTREE_THRESHOLD_MAX,
    Math.max(WORKSPACE_ASYNC_SUBTREE_THRESHOLD_MIN, parsed),
  );
}

export function workspaceSubtreeRequiresAsyncExecution(
  count: WorkspaceSubtreeNodeCount,
  threshold = resolveWorkspaceAsyncSubtreeThreshold(),
): boolean {
  if (count.probeLimitExceeded) {
    return true;
  }
  return count.totalNodes > threshold;
}
