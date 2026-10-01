/**
 * SCE-PERF-DASHBOARD-01 R10 — warm command-center benchmark + DB baseline + trace ledger.
 */
import "dotenv/config";
import { performance } from "node:perf_hooks";

process.env.SCE_HOTFIX_LOGIN_01_TRACE = "1";

function percentile(sorted: number[], p: number): number {
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p) - 1));
  return sorted[index] ?? sorted[sorted.length - 1] ?? 0;
}

async function measureSimpleQueryWarm(
  prismaClient: { $queryRaw: typeof import("@/lib/db/prisma").prisma.$queryRaw },
  iterations: number,
): Promise<number[]> {
  const warm: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await prismaClient.$queryRaw`SELECT 1 AS ok`;
    warm.push(performance.now() - start);
  }
  warm.sort((a, b) => a - b);
  return warm;
}

async function main(): Promise<void> {
  const { prisma } = await import("@/lib/db/prisma");
  const { getPersonalCommandCenterData } = await import(
    "@/lib/dashboard/personal-command-center"
  );
  const { getRequestEffectivePermissions } = await import(
    "@/lib/permissions/request-effective-permissions"
  );
  const { buildActorContext } = await import("@/lib/visibility/actor-context");
  const {
    createSceHotfixLogin01TraceStore,
    getSceHotfixLogin01TraceStore,
    sceHotfixLogin01TraceStorage,
  } = await import("@/lib/incident/sce-hotfix-login-01-trace-store");
  const { finishSceHotfixLogin01DashboardTrace } = await import(
    "@/lib/incident/sce-hotfix-login-01-trace"
  );
  type PermissionKey = import("@/lib/permissions/permissions").PermissionKey;

  const tenant = await prisma.tenant.findUnique({
    where: { key: "fc-allschwil" },
    select: { id: true, locale: true, timezone: true },
  });
  const user = await prisma.user.findFirst({
    where: { email: "it@fcallschwil.ch" },
    select: { id: true },
  });
  if (!tenant || !user) {
    console.log(JSON.stringify({ error: "FIXTURE_MISSING" }));
    process.exit(2);
  }

  const permissions = await getRequestEffectivePermissions(user.id, tenant.id);
  const permissionKeys = [...permissions.platform, ...permissions.tenant] as PermissionKey[];
  const actor = buildActorContext(
    { id: user.id, roleKeys: [], permissionKeys },
    [],
    [],
    tenant.id,
  );
  const fmtCfg = {
    locale: tenant.locale ?? "de-CH",
    timezone: tenant.timezone ?? "Europe/Zurich",
  };

  const loaderArgs = {
    tenantId: tenant.id,
    userId: user.id,
    actor,
    fmtCfg,
    permissionKeys,
  };

  const simpleWarm = await measureSimpleQueryWarm(prisma, 20);

  await getPersonalCommandCenterData(loaderArgs);

  const warm: number[] = [];
  for (let i = 0; i < 20; i++) {
    const store = createSceHotfixLogin01TraceStore(`bench-${i}`);
    sceHotfixLogin01TraceStorage.enterWith(store);
    const start = performance.now();
    await getPersonalCommandCenterData(loaderArgs);
    warm.push(performance.now() - start);
    finishSceHotfixLogin01DashboardTrace();
    const traceStore = getSceHotfixLogin01TraceStore();
    if (i === 19 && traceStore) {
      const stepDuration = (step: string) => traceStore.stepDurationMs.get(step) ?? 0;
      console.log(
        JSON.stringify({
          benchmark: "r10-decomposition-sample",
          stepDurationMs: {
            dashboardContext: stepDuration("dashboard-context"),
            programme: stepDuration("programme"),
            personalWork: stepDuration("personal-work"),
            operationalAttention: stepDuration("operational-attention"),
            personalActions: stepDuration("personal-actions"),
            commandCenterTotal: stepDuration("command-center-total"),
          },
          dbQueries: traceStore.dbQueries.length,
          dbExecutionMs: traceStore.dbQueries.reduce((s, q) => s + q.durationMs, 0),
        }),
      );
    }
  }
  warm.sort((a, b) => a - b);

  console.log(
    JSON.stringify({
      benchmark: "command-center-warm-r10",
      runtimeRegion: process.env.VERCEL_REGION ?? "local",
      neonRegionHint: "eu-central-1",
      simpleQueryWarmP50Ms: Number(percentile(simpleWarm, 0.5).toFixed(2)),
      simpleQueryWarmP95Ms: Number(percentile(simpleWarm, 0.95).toFixed(2)),
      warmIterations: warm.length,
      warmMinMs: Number(warm[0]!.toFixed(1)),
      warmP50Ms: Number(percentile(warm, 0.5).toFixed(1)),
      warmP95Ms: Number(percentile(warm, 0.95).toFixed(1)),
      warmMaxMs: Number(warm[warm.length - 1]!.toFixed(1)),
      targetMs: 500,
    }),
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
