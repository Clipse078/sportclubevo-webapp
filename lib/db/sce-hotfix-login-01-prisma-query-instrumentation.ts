/**
 * Request-scoped Prisma query timing for SCE-HOTFIX-LOGIN-01 dashboard diagnostics.
 */

import type { PrismaClient } from "@prisma/client";
import { recordSceHotfixLogin01DbQuery } from "@/lib/incident/sce-hotfix-login-01-trace";

const SLOW_QUERY_MS = 50;

export function extendPrismaClientWithSceHotfixLogin01QueryTrace(
  client: PrismaClient,
): PrismaClient {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const startedAt = Date.now();
          const result = await query(args);
          const durationMs = Date.now() - startedAt;
          if (durationMs >= SLOW_QUERY_MS) {
            recordSceHotfixLogin01DbQuery({
              model: model ?? "unknown",
              operation,
              durationMs,
              caller: "prisma",
            });
          }
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}
