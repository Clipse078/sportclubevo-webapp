/**
 * SCE-PERF-02R4 — request-scoped decomposition of getWeekplannerWeek I/O.
 * Enable with SCE_PERF_WEEK_QUERY_PROFILE=1 (diagnostics / SCE_PERF_TIMING).
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";
import type { PrismaClient } from "@prisma/client";

export type WeekQueryOperationKind =
  | "facilities"
  | "plan_overrides"
  | "plan_time_overrides"
  | "plan_baseline"
  | "tenant_presets"
  | "tenant_match_policy"
  | "tenant_logo"
  | "training_sessions"
  | "training_allocations"
  | "matches"
  | "match_dressing_occupancy"
  | "tournaments"
  | "tournament_dressing_occupancy"
  | "events_veranstaltung"
  | "week_transform"
  | "other";

export type WeekQueryOperationRow = {
  operation: WeekQueryOperationKind | string;
  queryCount: number;
  rowCount: number | null;
  wallMs: number;
  sequential: boolean;
  requiredInitial: boolean;
};

export type WeekQueryProfileReport = {
  operations: WeekQueryOperationRow[];
  totalWallMs: number;
  totalDbQueries: number;
  totalRows: number | null;
  sequentialDbChains: number;
  parallelGroups: number;
};

type OperationAccumulator = {
  operation: WeekQueryOperationKind | string;
  queryCount: number;
  rowCount: number | null;
  startedAt: number;
  wallMs: number;
  sequential: boolean;
  requiredInitial: boolean;
  parallelGroupId: number | null;
};

type ProfileStore = {
  operations: OperationAccumulator[];
  parallelGroupSeq: number;
  currentParallelGroupId: number | null;
  rootStartedAt: number;
};

const storage = new AsyncLocalStorage<ProfileStore>();

export function isWeekQueryProfileEnabled(): boolean {
  return (
    process.env.SCE_PERF_WEEK_QUERY_PROFILE === "1" ||
    (process.env.SCE_PERF_TIMING === "1" && process.env.SCE_PERF_WEEK_QUERY_PROFILE !== "0")
  );
}

export function runWithWeekQueryProfile<T>(fn: () => Promise<T>): Promise<T> {
  if (!isWeekQueryProfileEnabled()) {
    return fn();
  }
  const store: ProfileStore = {
    operations: [],
    parallelGroupSeq: 0,
    currentParallelGroupId: null,
    rootStartedAt: performance.now(),
  };
  return storage.run(store, async () => {
    const result = await fn();
    lastCompletedWeekQueryProfileReport = getWeekQueryProfileReport();
    return result;
  });
}

export function getLastCompletedWeekQueryProfileReport(): WeekQueryProfileReport | null {
  return lastCompletedWeekQueryProfileReport;
}

export function beginWeekQueryParallelGroup(): void {
  const store = storage.getStore();
  if (!store) return;
  store.parallelGroupSeq += 1;
  store.currentParallelGroupId = store.parallelGroupSeq;
}

export function endWeekQueryParallelGroup(): void {
  const store = storage.getStore();
  if (!store) return;
  store.currentParallelGroupId = null;
}

export async function profileWeekQueryOperation<T>(
  operation: WeekQueryOperationKind | string,
  fn: () => Promise<T>,
  opts: {
    sequential?: boolean;
    requiredInitial?: boolean;
    rowCount?: (result: T) => number | null;
  } = {},
): Promise<T> {
  if (!isWeekQueryProfileEnabled()) {
    return fn();
  }
  const store = storage.getStore();
  if (!store) {
    return fn();
  }

  const queryCountBefore = getActiveQueryCount(store);
  const startedAt = performance.now();
  const result = await fn();
  const wallMs = performance.now() - startedAt;
  const queryCount = getActiveQueryCount(store) - queryCountBefore;

  store.operations.push({
    operation,
    queryCount,
    rowCount: opts.rowCount ? opts.rowCount(result) : null,
    startedAt,
    wallMs,
    sequential: opts.sequential ?? false,
    requiredInitial: opts.requiredInitial ?? true,
    parallelGroupId: store.currentParallelGroupId,
  });

  return result;
}

function getActiveQueryCount(_store: ProfileStore): number {
  return weekQueryProfileGlobalQueryCount;
}

let weekQueryProfileGlobalQueryCount = 0;
let lastCompletedWeekQueryProfileReport: WeekQueryProfileReport | null = null;

export function incrementWeekQueryProfileQueryCount(): void {
  if (!isWeekQueryProfileEnabled()) return;
  weekQueryProfileGlobalQueryCount += 1;
}

export function resetWeekQueryProfileQueryCounter(): void {
  weekQueryProfileGlobalQueryCount = 0;
}

export function getWeekQueryProfileReport(): WeekQueryProfileReport | null {
  const store = storage.getStore();
  if (!store) return null;

  const merged = new Map<string, WeekQueryOperationRow>();
  for (const op of store.operations) {
    const key = op.operation;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        operation: op.operation,
        queryCount: op.queryCount,
        rowCount: op.rowCount,
        wallMs: op.wallMs,
        sequential: op.sequential,
        requiredInitial: op.requiredInitial,
      });
      continue;
    }
    existing.queryCount += op.queryCount;
    existing.wallMs += op.wallMs;
    if (op.rowCount != null) {
      existing.rowCount = (existing.rowCount ?? 0) + op.rowCount;
    }
  }

  const operations = [...merged.values()].sort((a, b) => b.wallMs - a.wallMs);
  const totalDbQueries = operations.reduce((n, row) => n + row.queryCount, 0);
  const totalRows = operations.every((row) => row.rowCount == null)
    ? null
    : operations.reduce((n, row) => n + (row.rowCount ?? 0), 0);

  const parallelGroupIds = new Set(
    store.operations.map((op) => op.parallelGroupId).filter((id): id is number => id != null),
  );

  return {
    operations,
    totalWallMs: performance.now() - store.rootStartedAt,
    totalDbQueries,
    totalRows,
    sequentialDbChains: store.operations.filter((op) => op.sequential && op.queryCount > 0).length,
    parallelGroups: parallelGroupIds.size,
  };
}

export function extendPrismaClientWithWeekQueryProfile(client: PrismaClient): PrismaClient {
  if (!isWeekQueryProfileEnabled()) {
    return client;
  }

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ query, args }) {
          incrementWeekQueryProfileQueryCount();
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

export function formatWeekQueryProfileTable(report: WeekQueryProfileReport): string {
  const header =
    "OPERATION | QUERY_COUNT | ROW_COUNT | WALL_MS | SEQUENTIAL | REQUIRED_INITIAL";
  const lines = report.operations.map((row) => {
    const rowCount = row.rowCount == null ? "-" : String(row.rowCount);
    return [
      row.operation,
      row.queryCount,
      rowCount,
      row.wallMs.toFixed(1),
      row.sequential ? "yes" : "no",
      row.requiredInitial ? "yes" : "no",
    ].join(" | ");
  });
  return [header, ...lines].join("\n");
}
