import { performance } from "node:perf_hooks";
import type { PrismaClient } from "@prisma/client";
import { getEffectivePrismaRuntimeConnectionSource } from "@/lib/db/runtime-connection";
import type { RuntimeEnvironment } from "@/lib/env";
import { summarizeLatency } from "@/lib/diagnostics/sce-perf-stats";

/** Small warm sample count for live Vercel region proof (PERFORMANCE-01A-R1). */
export const SCE_PERF_01A_REGION_SELECT1_SAMPLES = 5;

export type Perf01aRegionProofPayload = {
  vercelRegion: string | null;
  databaseRegion: string | null;
  select1: {
    samplesMs: number[];
    p50Ms: number;
    p95Ms: number;
  };
};

/**
 * STAGE and Vercel Preview only — fail closed everywhere else (including PROD).
 */
export function isPerf01aRegionProofEnvironment(
  runtime: Pick<RuntimeEnvironment, "isProd" | "isPreview" | "isStage">,
): boolean {
  if (runtime.isProd) {
    return false;
  }
  return runtime.isPreview || runtime.isStage;
}

/** Parses Neon/AWS region from a connection string without exposing hostnames. */
export function parseNeonDatabaseRegion(connectionString: string | null): string | null {
  if (!connectionString) {
    return null;
  }
  try {
    const host = new URL(connectionString.replace(/^postgresql:/, "http:")).hostname;
    const match = host.match(
      /\.(eu-central-1|eu-west-1|us-east-1|us-east-2|us-west-2|ap-southeast-1)\./,
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Read-only SELECT 1 warm RTT samples using the shared Prisma client (no new client per sample).
 */
export async function collectPerf01aRegionProof(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
  sampleCount: number = SCE_PERF_01A_REGION_SELECT1_SAMPLES,
): Promise<Perf01aRegionProofPayload> {
  const connectionString = getEffectivePrismaRuntimeConnectionSource(env).value;
  const databaseRegion = parseNeonDatabaseRegion(connectionString);

  const samplesMs: number[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1 AS ok`;
    samplesMs.push(Number((performance.now() - start).toFixed(1)));
  }

  const summary = summarizeLatency("select1", samplesMs);

  return {
    vercelRegion: env.VERCEL_REGION?.trim() || null,
    databaseRegion,
    select1: {
      samplesMs,
      p50Ms: summary.p50Ms,
      p95Ms: summary.p95Ms,
    },
  };
}
