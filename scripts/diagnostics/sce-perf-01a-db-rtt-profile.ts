/**
 * PERFORMANCE-01A — read-only database round-trip profile (no writes).
 * Uses the same Prisma/pg adapter stack as production runtime.
 */
import "./sce-perf-preload.mjs";
import "dotenv/config";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { summarizeLatency } from "@/lib/diagnostics/sce-perf-stats";
import { getEffectivePrismaRuntimeConnectionSource } from "@/lib/db/runtime-connection";

function parseNeonRegion(connectionString: string | null): string | null {
  if (!connectionString) return null;
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

function hostRedacted(connectionString: string | null): string | null {
  if (!connectionString) return null;
  try {
    const host = new URL(connectionString.replace(/^postgresql:/, "http:")).hostname;
    return host.replace(/^ep-[^.]+/, "ep-REDACTED");
  } catch {
    return null;
  }
}

async function measureColdWarmSelect1(
  label: string,
  runQuery: () => Promise<unknown>,
  warmSamples: number,
): Promise<{ coldMs: number; warmMs: number[] }> {
  const coldStart = performance.now();
  await runQuery();
  const coldMs = performance.now() - coldStart;

  const warmMs: number[] = [];
  for (let i = 0; i < warmSamples; i++) {
    const start = performance.now();
    await runQuery();
    warmMs.push(performance.now() - start);
  }
  return { coldMs, warmMs };
}

async function main(): Promise<void> {
  const runtime = getEffectivePrismaRuntimeConnectionSource();
  const connectionString = runtime.value;
  if (!connectionString) {
    console.log(JSON.stringify({ error: "DATABASE_URL_MISSING" }));
    process.exit(2);
  }

  const { prisma } = await import("@/lib/db/prisma");

  const tenant = await prisma.tenant.findUnique({
    where: { key: "fc-allschwil" },
    select: { id: true },
  });

  const select1 = async () => {
    await prisma.$queryRaw`SELECT 1 AS ok`;
  };
  const tenantLookup = async () => {
    if (!tenant) throw new Error("TENANT_MISSING");
    await prisma.tenant.findUnique({
      where: { id: tenant.id },
      select: { id: true, key: true },
    });
  };

  const select1Profile = await measureColdWarmSelect1("select1", select1, 30);
  const tenantProfile = tenant
    ? await measureColdWarmSelect1("tenant_lookup", tenantLookup, 20)
    : null;

  const seqStart = performance.now();
  for (let i = 0; i < 10; i++) await select1();
  const sequential10Ms = performance.now() - seqStart;

  const parStart = performance.now();
  await Promise.all(Array.from({ length: 10 }, () => select1()));
  const parallel10Ms = performance.now() - parStart;

  const freshPoolStart = performance.now();
  const freshPool = new Pool({ connectionString });
  const freshClient = new PrismaClient({ adapter: new PrismaPg(freshPool) });
  let freshFirstQueryMs = 0;
  const firstQueryStart = performance.now();
  await freshClient.$queryRaw`SELECT 1 AS ok`;
  freshFirstQueryMs = performance.now() - firstQueryStart;
  const freshPoolReadyMs = performance.now() - freshPoolStart;
  await freshClient.$disconnect();
  await freshPool.end();

  const select1WarmSummary = summarizeLatency("select1", select1Profile.warmMs);
  const tenantWarmSummary = tenantProfile
    ? summarizeLatency("tenant_lookup", tenantProfile.warmMs)
    : null;

  console.log(
    JSON.stringify(
      {
        package: "PERFORMANCE-01A",
        environment: {
          label: process.env.VERCEL_REGION ? "vercel" : "cloud-agent",
          vercelRegion: process.env.VERCEL_REGION ?? null,
          nodeEnv: process.env.NODE_ENV ?? null,
        },
        connection: {
          prismaVariable: runtime.variable,
          hostRedacted: hostRedacted(connectionString),
          neonAwsRegion: parseNeonRegion(connectionString),
          poolerHostname: hostRedacted(connectionString)?.includes("pooler") ?? false,
        },
        tests: {
          select1: {
            coldMs: Number(select1Profile.coldMs.toFixed(2)),
            warm: select1WarmSummary,
          },
          tenantIndexedLookup: tenantWarmSummary
            ? {
                coldMs: Number(tenantProfile!.coldMs.toFixed(2)),
                warm: tenantWarmSummary,
              }
            : { skipped: true, reason: "fc-allschwil tenant missing" },
          sequential10QueryWallMs: Number(sequential10Ms.toFixed(2)),
          parallel10QueryWallMs: Number(parallel10Ms.toFixed(2)),
          freshClientFirstSelect1Ms: Number(freshFirstQueryMs.toFixed(2)),
          freshClientConstructToFirstQueryMs: Number(freshPoolReadyMs.toFixed(2)),
        },
        estimates: {
          baseRttMsP50: select1WarmSummary.p50Ms,
          connectionSetupMs: Number(
            Math.max(0, freshPoolReadyMs - freshFirstQueryMs).toFixed(2),
          ),
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.$disconnect();
  });
