/**
 * SCE-PERF-DASHBOARD-02 — warm dashboard projection benchmark (FCA Michael context).
 */
import "./sce-perf-preload.mjs";
import "dotenv/config";
import { performance } from "node:perf_hooks";

process.env.SCE_HOTFIX_LOGIN_01_TRACE = "1";
process.env.SCE_PERF_DASHBOARD_02_SYNC_REBUILD = "1";

function percentile(sorted: number[], p: number): number {
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1));
  return sorted[index] ?? sorted[sorted.length - 1] ?? 0;
}

async function main(): Promise<void> {
  const { prisma } = await import("@/lib/db/prisma");
  const { getPersonalCommandCenterData } = await import(
    "@/lib/dashboard/personal-command-center"
  );
  const { rebuildPersonalDashboardReadModel } = await import(
    "@/lib/dashboard/read-model/rebuild"
  );
  const { getRequestEffectivePermissions } = await import(
    "@/lib/permissions/request-effective-permissions"
  );
  const { buildActorContext } = await import("@/lib/visibility/actor-context");
  const {
    createSceHotfixLogin01TraceStore,
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

  await rebuildPersonalDashboardReadModel({
    tenantId: tenant.id,
    userId: user.id,
    fmtCfg,
  });

  const loaderArgs = {
    tenantId: tenant.id,
    userId: user.id,
    actor,
    fmtCfg,
    permissionKeys,
  };

  const warm: number[] = [];
  const dbCalls: number[] = [];

  for (let i = 0; i < 25; i++) {
    const store = createSceHotfixLogin01TraceStore(`bench-${i}`);
    sceHotfixLogin01TraceStorage.enterWith(store);
    const start = performance.now();
    await getPersonalCommandCenterData(loaderArgs);
    warm.push(performance.now() - start);
    await finishSceHotfixLogin01DashboardTrace();
    dbCalls.push(store.dbQueries.length);
  }

  warm.sort((a, b) => a - b);
  dbCalls.sort((a, b) => a - b);

  console.log(
    JSON.stringify(
      {
        benchmark: "dashboard-projection-warm",
        warmIterations: warm.length,
        warmMinMs: warm[0],
        warmP50Ms: percentile(warm, 0.5),
        warmP95Ms: percentile(warm, 0.95),
        warmMaxMs: warm[warm.length - 1],
        dbCallsP50: percentile(dbCalls, 0.5),
        dbCallsP95: percentile(dbCalls, 0.95),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
