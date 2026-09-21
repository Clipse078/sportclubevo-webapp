/**
 * AUFGABEN-06A — Unified Task activity timeline (AuditLog + TaskComment).
 *
 * Pagination is newest-first in the service layer. UI may render oldest-first.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TASK_TIMELINE_PAGE_SIZE } from "./constants";
import { requireVisibleTask } from "./task-access";
import type { TaskServiceContext } from "./types";
import { getTaskCommentForTimeline } from "./task-comment-service";
import {
  enrichTaskComments,
  hydrateTaskTimelineActors,
} from "./task-comment-enrichment";
import {
  mapAuditLogToTimelineEntry,
  mapCommentToTimelineEntry,
} from "./task-timeline-mapper";
import type {
  TaskTimelineCursor,
  TaskTimelinePageDto,
} from "./task-timeline-types";

const SOURCE_RANK = {
  COMMENT: 0,
  AUDIT: 1,
} as const;

type TimelineSource = keyof typeof SOURCE_RANK;

type MergeItem = {
  occurredAt: Date;
  source: TimelineSource;
  id: string;
};

function encodeCursor(cursor: TaskTimelineCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeTaskTimelineCursor(raw: string | null | undefined): TaskTimelineCursor | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as TaskTimelineCursor;
    if (
      parsed &&
      typeof parsed.occurredAt === "string" &&
      (parsed.source === "AUDIT" || parsed.source === "COMMENT") &&
      typeof parsed.id === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function compareDesc(a: MergeItem, b: MergeItem): number {
  const at = a.occurredAt.getTime();
  const bt = b.occurredAt.getTime();
  if (at !== bt) return bt - at;
  const sr = SOURCE_RANK[b.source] - SOURCE_RANK[a.source];
  if (sr !== 0) return sr;
  return b.id.localeCompare(a.id);
}

function isOlderThanCursor(item: MergeItem, cursor: TaskTimelineCursor): boolean {
  const cursorItem: MergeItem = {
    occurredAt: new Date(cursor.occurredAt),
    source: cursor.source,
    id: cursor.id,
  };
  // Item is older when it sorts after the cursor in newest-first order.
  return compareDesc(cursorItem, item) < 0;
}

function buildAuditCursorFilter(cursor: TaskTimelineCursor | null): Prisma.AuditLogWhereInput {
  if (!cursor) return {};
  const cursorAt = new Date(cursor.occurredAt);
  if (cursor.source === "COMMENT") {
    return {
      OR: [{ createdAt: { lt: cursorAt } }, { createdAt: cursorAt }],
    };
  }
  return {
    OR: [
      { createdAt: { lt: cursorAt } },
      { createdAt: cursorAt, id: { lt: cursor.id } },
    ],
  };
}

function buildCommentCursorFilter(cursor: TaskTimelineCursor | null): Prisma.TaskCommentWhereInput {
  if (!cursor) return {};
  const cursorAt = new Date(cursor.occurredAt);
  if (cursor.source === "AUDIT") {
    // Comments at the same timestamp sort after audits and may appear on the next page.
    return {
      OR: [{ createdAt: { lt: cursorAt } }, { createdAt: cursorAt }],
    };
  }
  return {
    OR: [
      { createdAt: { lt: cursorAt } },
      { createdAt: cursorAt, id: { lt: cursor.id } },
    ],
  };
}

function collectAssigneeIdsFromAudit(rows: Array<{ afterJson: unknown; beforeJson: unknown }>): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    for (const payload of [row.afterJson, row.beforeJson]) {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) continue;
      const assignees = (payload as Record<string, unknown>).assigneeUserIds;
      if (Array.isArray(assignees)) {
        for (const id of assignees) {
          if (typeof id === "string") ids.add(id);
        }
      }
    }
  }
  return [...ids];
}

export async function loadTaskTimelinePage(
  ctx: TaskServiceContext,
  taskId: string,
  cursorRaw?: string | null,
  pageSize = TASK_TIMELINE_PAGE_SIZE,
): Promise<TaskTimelinePageDto> {
  await requireVisibleTask(ctx, taskId);
  const cursor = decodeTaskTimelineCursor(cursorRaw);
  if (cursor && new Date(cursor.occurredAt).getTime() > Date.now()) {
    return { entries: [], nextCursor: null, hasMore: false };
  }
  const fetchSize = pageSize + 1;

  const auditWhere: Prisma.AuditLogWhereInput = {
    tenantId: ctx.tenantId,
    moduleKey: "tasks",
    entityType: "Task",
    entityId: taskId,
    ...buildAuditCursorFilter(cursor),
  };

  const [auditRows, commentRows] = await Promise.all([
    prisma.auditLog.findMany({
      where: auditWhere,
      select: {
        id: true,
        actorUserId: true,
        action: true,
        beforeJson: true,
        afterJson: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: fetchSize,
    }),
    getTaskCommentForTimeline(
      ctx.tenantId,
      taskId,
      buildCommentCursorFilter(cursor),
      fetchSize,
    ),
  ]);

  const commentDtos = await enrichTaskComments(ctx.tenantId, commentRows);

  const mergePool: Array<
    MergeItem & {
      entry: ReturnType<typeof mapAuditLogToTimelineEntry> | ReturnType<typeof mapCommentToTimelineEntry>;
    }
  > = [];

  for (const row of auditRows) {
    const item: MergeItem = {
      occurredAt: row.createdAt,
      source: "AUDIT",
      id: row.id,
    };
    if (cursor && !isOlderThanCursor(item, cursor)) continue;
    mergePool.push({
      ...item,
      entry: mapAuditLogToTimelineEntry(row, "Unbekannt", new Map()),
    });
  }

  for (const comment of commentDtos) {
    const item: MergeItem = {
      occurredAt: new Date(comment.createdAt),
      source: "COMMENT",
      id: comment.id,
    };
    if (cursor && !isOlderThanCursor(item, cursor)) continue;
    mergePool.push({
      ...item,
      entry: mapCommentToTimelineEntry(comment),
    });
  }

  mergePool.sort((a, b) => compareDesc(a, b));

  const pageItems = mergePool.slice(0, pageSize);
  const hasMore =
    mergePool.length > pageSize ||
    auditRows.length >= fetchSize ||
    commentRows.length >= fetchSize;

  const actorUserIds = new Set<string>();
  const assigneeUserIds = new Set<string>();

  for (const row of auditRows) {
    if (row.actorUserId) actorUserIds.add(row.actorUserId);
  }
  for (const id of collectAssigneeIdsFromAudit(auditRows)) {
    assigneeUserIds.add(id);
  }
  for (const comment of commentDtos) {
    actorUserIds.add(comment.authorUserId);
  }

  const displayByUserId = await hydrateTaskTimelineActors(ctx.tenantId, [
    ...actorUserIds,
    ...assigneeUserIds,
  ]);

  const entries = pageItems.map((item) => {
    if (item.source === "COMMENT") {
      return item.entry;
    }
    const row = auditRows.find((r) => r.id === item.id)!;
    const actorName = row.actorUserId
      ? (displayByUserId.get(row.actorUserId) ?? "Unbekannt")
      : "Unbekannt";
    return mapAuditLogToTimelineEntry(row, actorName, displayByUserId);
  });

  const last = pageItems.at(-1);
  const nextCursor = hasMore && last
    ? encodeCursor({
        occurredAt: last.occurredAt.toISOString(),
        source: last.source,
        id: last.id,
      })
    : null;

  return {
    entries,
    nextCursor,
    hasMore,
  };
}
