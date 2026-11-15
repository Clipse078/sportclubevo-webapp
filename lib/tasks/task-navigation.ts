/**
 * AUFGABEN-06E — canonical Task navigation helpers (single source for workspace routes).
 */

import type { TaskContextType } from "@prisma/client";

const TASK_BASE = "/dashboard/aufgaben";

export function taskWorkspaceHref(taskId: string, options?: { returnTo?: string | null }): string {
  const base = `${TASK_BASE}/${encodeURIComponent(taskId)}`;
  const returnTo = options?.returnTo?.trim();
  if (!returnTo) {
    return base;
  }
  const params = new URLSearchParams({ returnTo });
  return `${base}?${params.toString()}`;
}

export function parseTaskWorkspaceReturnTo(
  searchParams: Record<string, string | undefined>,
): string | null {
  const raw = searchParams.returnTo ?? searchParams.from;
  return raw?.trim() ? raw.trim() : null;
}

/** Stable deep link to a task timeline comment anchor. */
export function taskWorkspaceCommentHref(taskId: string, commentId: string): string {
  return `${taskWorkspaceHref(taskId)}#comment-${encodeURIComponent(commentId)}`;
}

export function taskSeriesHref(seriesId: string, page?: number): string {
  const base = `${TASK_BASE}/serien/${encodeURIComponent(seriesId)}`;
  if (page == null || page <= 1) return base;
  return `${base}?page=${page}`;
}

export function taskCreateHref(): string {
  return `${TASK_BASE}/neu`;
}

export function taskSeriesCreateHref(): string {
  return `${TASK_BASE}/serien/neu`;
}

export function taskCreateFromContextHref(
  contextType: TaskContextType,
  contextId: string,
): string {
  const params = new URLSearchParams({
    contextType,
    contextId,
  });
  return `${taskCreateHref()}?${params.toString()}`;
}

export function parseTaskCommentAnchorFromHash(hash: string): string | null {
  const trimmed = hash.replace(/^#/, "").trim();
  if (!trimmed.startsWith("comment-")) return null;
  const id = trimmed.slice("comment-".length).trim();
  return id || null;
}
