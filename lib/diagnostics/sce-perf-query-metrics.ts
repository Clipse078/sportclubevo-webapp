/**
 * SCE-PERF-02A — optional Prisma query counters for diagnostic scripts only.
 * Gated by SCE_PERF_TIMING=1; never logs SQL text or parameters.
 */

import type { PrismaClient } from "@prisma/client";
import { isScePerfTimingEnabled } from "@/lib/planning-hub/admin-server-timing";

export type ScePerfQueryMetrics = {
  queryCount: number;
  aggregateQueryMs: number;
};

export function createScePerfQueryMetrics(): ScePerfQueryMetrics {
  return { queryCount: 0, aggregateQueryMs: 0 };
}

export function wrapPrismaWithScePerfQueryMetrics<T extends PrismaClient>(
  client: T,
  metrics: ScePerfQueryMetrics,
): T {
  if (!isScePerfTimingEnabled()) {
    return client;
  }

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ query, args }) {
          const started = performance.now();
          try {
            return await query(args);
          } finally {
            metrics.queryCount += 1;
            metrics.aggregateQueryMs += performance.now() - started;
          }
        },
      },
    },
  }) as T;
}
