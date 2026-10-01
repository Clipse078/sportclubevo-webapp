/**
 * SCE-HOTFIX-LOGIN-01 R8 — read-only STAGE loader variance benchmark (no writes).
 * Times dashboard command-center loaders for FCA actor; optional pg_stat_activity snapshot.
 */
import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/db/prisma";
import { getPersonalCommandCenterData } from "@/lib/dashboard/personal-command-center";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { buildActorContext } from "@/lib/visibility/actor-context";
import { summarizeLatency } from "@/lib/diagnostics/sce-perf-stats";

const TENANT_KEY = "fc-allschwil";
const ACTOR_EMAIL = "it@fcallschwil.ch";
const ITERATIONS = Number(process.env.SCE_R8_BENCH_ITERATIONS ?? "8");

async function snapshotPgActivity(): Promise<
  { state: string; wait_event_type: string | null; wait_event: string | null; count: number }[]
> {
  try {
    return await prisma.$queryRaw<
      { state: string; wait_event_type: string | null; wait_event: string | null; count: bigint }[]
    >`
      SELECT state, wait_event_type, wait_event, COUNT(*)::bigint AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY 1, 2, 3
      ORDER BY count DESC
    `.then((rows) =>
      rows.map((row) => ({
        state: row.state,
        wait_event_type: row.wait_event_type,
        wait_event: row.wait_event,
        count: Number(row.count),
      })),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return [{ state: "error", wait_event_type: message, wait_event: null, count: 0 }];
  }
}

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { key: TENANT_KEY },
    select: { id: true, locale: true, timezone: true },
  });
  const user = await prisma.user.findFirst({
    where: { email: ACTOR_EMAIL },
    select: { id: true },
  });

  if (!tenant || !user) {
    console.log(JSON.stringify({ error: "FIXTURE_MISSING", tenant: Boolean(tenant), user: Boolean(user) }));
    process.exit(2);
  }

  const permissions = await getRequestEffectivePermissions(user.id, tenant.id);
  const permissionKeys = [...permissions.platform, ...permissions.tenant];
  const actor = buildActorContext(
    {
      id: user.id,
      roleKeys: [],
      permissionKeys,
    },
    [],
    [],
    tenant.id,
  );

  const fmtCfg = {
    locale: tenant.locale ?? "de-CH",
    timezone: tenant.timezone ?? "Europe/Zurich",
  };

  const totals: number[] = [];
  const programmeMs: number[] = [];
  const personalWorkMs: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const started = performance.now();
    const tProgramme = performance.now();
    await getPersonalCommandCenterData({
      tenantId: tenant.id,
      userId: user.id,
      actor,
      fmtCfg,
      permissionKeys,
    });
    const elapsed = performance.now() - started;
    totals.push(elapsed);
    programmeMs.push(elapsed);
    personalWorkMs.push(elapsed);
  }

  const pgActivity = await snapshotPgActivity();

  console.log(
    JSON.stringify(
      {
        benchmark: "sce-hotfix-login-01-r8-readonly-loader",
        tenantKey: TENANT_KEY,
        actorEmail: ACTOR_EMAIL,
        iterations: ITERATIONS,
        commandCenterTotalMs: summarizeLatency("command-center-total", totals),
        pgStatActivity: pgActivity,
        note: "Loader-only; excludes auth/layout/RSC streaming. Same code path as Suspense async child.",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
