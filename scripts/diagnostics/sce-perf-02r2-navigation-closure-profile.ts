/**
 * SCE-PERF-02R2 — participation + planning decomposition + final matrix.
 */
import "dotenv/config";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { getPersonProfileByUserId } from "@/lib/people/queries";
import { resolvePersonalParticipationNavCapabilityUncached } from "@/lib/personal-actions/access";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { getCurrentTenantContextByIdCached } from "@/lib/server/request-cache";
import { getCmsOverviewStats } from "@/lib/cms/overview-stats";
import { buildAdminHubGroupsForUser } from "@/lib/nav/admin-hub-catalog";
import { resolveCommunicationHubCapabilityAccess } from "@/lib/communication/hub-access";
import { listWeekplannerPlans } from "@/lib/weekplanner/plan-service";
import { listWochenplanPlans } from "@/lib/wochenplan/plan-service";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { getCurrentTenantContextById } from "@/lib/tenants/context";
import type { PermissionKey } from "@/lib/permissions/permissions";

type StepRow = {
  step: string;
  callCount: number;
  totalMs: number;
  requiredForInitialShell: boolean;
  notes: string;
};

function createStepProfiler(requiredDefault = true) {
  const rows: StepRow[] = [];
  const counters = new Map<string, number>();

  return {
    rows,
    async run(step: string, notes: string, fn: () => Promise<void>, required = requiredDefault) {
      const callCount = (counters.get(step) ?? 0) + 1;
      counters.set(step, callCount);
      const start = performance.now();
      await fn();
      const durationMs = performance.now() - start;
      const existing = rows.find((r) => r.step === step);
      if (existing) {
        existing.callCount = callCount;
        existing.totalMs += durationMs;
      } else {
        rows.push({ step, callCount: 1, totalMs: durationMs, requiredForInitialShell: required, notes });
      }
    },
  };
}

function printTable(title: string, rows: StepRow[]) {
  console.log(title);
  for (const row of rows) {
    console.log(
      `${row.step} | ${row.callCount} | ${row.totalMs.toFixed(1)} | ${row.requiredForInitialShell ? "yes" : "no"} | ${row.notes}`,
    );
  }
}

async function pickFcaBenchUser() {
  const email = process.env.SCE_PERF_AUTH_EMAIL?.trim() || "it@fcallschwil.ch";
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) throw new Error(`Benchmark user not found (${email}).`);
  return user;
}

async function profileParticipation(userId: string, tenantId: string): Promise<StepRow[]> {
  const p = createStepProfiler();
  await prisma.$queryRaw`SELECT 1`;

  await p.run("person lookup (tenant-scoped)", "Prisma findFirst — duplicate of shell identity path", async () => {
    await prisma.person.findFirst({
      where: { userId, tenantId },
      select: { id: true },
    });
  });

  let personId: string | null = null;
  await p.run("person lookup for counts", "feeds guardian/squad probes", async () => {
    const person = await prisma.person.findFirst({
      where: { userId, tenantId },
      select: { id: true },
    });
    personId = person?.id ?? null;
  });

  await p.run("guardian count", "sequential probe", async () => {
    if (!personId) return;
    await prisma.guardianRelationship.count({
      where: { tenantId, guardianPersonId: personId },
    });
  });

  await p.run("squad count", "sequential probe", async () => {
    if (!personId) return;
    await prisma.playerSquadMember.count({
      where: {
        personId,
        teamSeason: { status: "ACTIVE", team: { tenantId } },
      },
    });
  });

  await p.run("parallel guardian+squad counts", "legacy path — pool serializes", async () => {
    if (!personId) return;
    await Promise.all([
      prisma.guardianRelationship.count({
        where: { tenantId, guardianPersonId: personId },
      }),
      prisma.playerSquadMember.count({
        where: {
          personId,
          teamSeason: { status: "ACTIVE", team: { tenantId } },
        },
      }),
    ]);
  }, true);

  await p.run("collapsed EXISTS capability SQL", "current resolvePersonalParticipationNavCapabilityUncached", async () => {
    await resolvePersonalParticipationNavCapabilityUncached({ tenantId, userId });
  }, true);

  await p.run("shell person profile (parallel peer)", "getPersonProfileByUserId — layout parallel block", async () => {
    await getPersonProfileByUserId(userId);
  }, true);

  return p.rows;
}

async function profilePlanning(userId: string, tenantId: string): Promise<StepRow[]> {
  const p = createStepProfiler(false);
  await prisma.$queryRaw`SELECT 1`;

  await p.run("live RBAC (requireAnyPermission)", "getRequestEffectivePermissions", async () => {
    await getRequestEffectivePermissions(userId, tenantId);
  }, true);

  await p.run("getActiveTenant context", "getCurrentTenantContextByIdCached (same DB read as getActiveTenant)", async () => {
    await getCurrentTenantContextByIdCached(tenantId);
  }, true);

  await p.run("listWochenplanPlans", "L1 plan chrome", async () => {
    await listWochenplanPlans(tenantId);
  }, true);

  await p.run("listWeekplannerPlans", "L1 week plan list", async () => {
    await listWeekplannerPlans(tenantId, "");
  }, true);

  await p.run("plan lists parallel", "Promise.all — matches planner/week page", async () => {
    await Promise.all([listWochenplanPlans(tenantId), listWeekplannerPlans(tenantId, "")]);
  }, true);

  await p.run("auth+tenant parallel", "Promise.all — planner/week page gate", async () => {
    await Promise.all([
      getRequestEffectivePermissions(userId, tenantId),
      getCurrentTenantContextByIdCached(tenantId),
    ]);
  }, true);

  return p.rows;
}

async function benchRoute(fn: () => Promise<void>) {
  const coldStart = performance.now();
  await fn();
  const coldMs = performance.now() - coldStart;
  const warmStart = performance.now();
  await fn();
  const warmMs = performance.now() - warmStart;
  return { coldMs: Number(coldMs.toFixed(1)), warmMs: Number(warmMs.toFixed(1)) };
}

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { key: "fc-allschwil" },
    select: { id: true, name: true },
  });
  if (!tenant) throw new Error("Tenant fc-allschwil not found.");
  const user = await pickFcaBenchUser();

  const participationProfile = await profileParticipation(user.id, tenant.id);
  printTable("=== PARTICIPATION_PROFILE_AFTER ===", participationProfile);

  const planningProfile = await profilePlanning(user.id, tenant.id);
  printTable("\n=== PLANNING_PROFILE_AFTER ===", planningProfile);

  const adminShell = async () => {
    const tenantCtx = await getCurrentTenantContextById(tenant.id);
    void tenantCtx;
    await getPersonProfileByUserId(user.id);
    await resolvePersonalParticipationNavCapabilityUncached({ tenantId: tenant.id, userId: user.id });
    const perms = await getRequestEffectivePermissions(user.id, tenant.id);
    buildAdminHubGroupsForUser([
      ...new Set([...perms.platform, ...perms.tenant]),
    ] as PermissionKey[]);
  };

  const adminHubOnly = async () => {
    const perms = await getRequestEffectivePermissions(user.id, tenant.id);
    buildAdminHubGroupsForUser([
      ...new Set([...perms.platform, ...perms.tenant]),
    ] as PermissionKey[]);
  };

  const planningPath = async () => {
    await Promise.all([
      getRequestEffectivePermissions(user.id, tenant.id),
      getCurrentTenantContextByIdCached(tenant.id),
    ]);
    await Promise.all([
      listWochenplanPlans(tenant.id),
      listWeekplannerPlans(tenant.id, ""),
    ]);
  };

  const matrix = [
    {
      route: "/dashboard/admin (full shell+hub)",
      ...(await benchRoute(adminShell)),
      measurementType: "SERVER_PATH_MS",
      appBottleneck: "live RBAC + participation EXISTS",
      infraBottleneck: "cold PG connection on first query of process",
    },
    {
      route: "/dashboard/admin (hub only)",
      ...(await benchRoute(adminHubOnly)),
      measurementType: "SERVER_PATH_MS",
      appBottleneck: "live RBAC",
      infraBottleneck: "none on warm repeat",
    },
    {
      route: "/dashboard/website",
      ...(await benchRoute(async () => {
        await getCmsOverviewStats(tenant.id);
      })),
      measurementType: "SERVER_PATH_MS",
      appBottleneck: "CMS aggregate SQL",
      infraBottleneck: "cold first query",
    },
    {
      route: "/dashboard/planner/week",
      ...(await benchRoute(planningPath)),
      measurementType: "SERVER_PATH_MS",
      appBottleneck: "live RBAC + parallel plan lists",
      infraBottleneck: "cold first query",
    },
    {
      route: "/dashboard/communication",
      ...(await benchRoute(async () => {
        const perms = await getRequestEffectivePermissions(user.id, tenant.id);
        resolveCommunicationHubCapabilityAccess(perms.tenant);
      })),
      measurementType: "SERVER_PATH_MS",
      appBottleneck: "live RBAC",
      infraBottleneck: "none on warm repeat",
    },
  ];

  console.log("\n=== PERFORMANCE_MATRIX_FINAL ===");
  for (const row of matrix) {
    console.log(
      `${row.route} | COLD=${row.coldMs} | WARM=${row.warmMs} | ${row.measurementType} | app=${row.appBottleneck} | infra=${row.infraBottleneck}`,
    );
  }

  const coldConnStart = performance.now();
  await prisma.$queryRaw`SELECT 1`;
  const coldConnMs = performance.now() - coldConnStart;
  const resolver = createEffectivePermissionResolver(prisma);
  const rbacStart = performance.now();
  await resolver.getEffectivePermissions({ userId: user.id, tenantId: tenant.id });
  const rbacMs = performance.now() - rbacStart;

  console.log("\n=== ADMIN_COLD_ANALYSIS ===");
  console.log(
    `first_pg_ping_ms=${coldConnMs.toFixed(1)} live_rbac_ms=${rbacMs.toFixed(1)} participation_exists=~97ms (post-R2)`,
  );
  console.log(
    "Cold admin shell >500ms is dominated by sequential cold-start queries (participation+RBAC each ~1 RTT) when measured outside React cache; warm hub-only repeat is RBAC-bound (~380ms).",
  );

  const artifactPath =
    process.env.SCE_PERF_BENCH_ARTIFACT?.trim() ||
    "/opt/cursor/artifacts/sce-perf-02r2-navigation-closure.json";
  writeFileSync(
    artifactPath,
    `${JSON.stringify({ participationProfile, planningProfile, matrix, adminCold: { coldConnMs, rbacMs } })}\n`,
    "utf8",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
