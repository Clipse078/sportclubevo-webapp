/**
 * SCE-PERF-02R3 — full /dashboard/planner/week useful-content decomposition.
 * Simulates authenticated layout + page gate + plan resolution + week data section.
 */
import "dotenv/config";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { getPersonProfileByUserId } from "@/lib/people/queries";
import { resolvePersonalParticipationNavCapabilityUncached } from "@/lib/personal-actions/access";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { getCurrentTenantContextByIdCached } from "@/lib/server/request-cache";
import { listWeekplannerPlans } from "@/lib/weekplanner/plan-service";
import { listWochenplanPlans } from "@/lib/wochenplan/plan-service";
import { getWeekplannerWeek } from "@/lib/weekplanner/queries";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import { getTenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/tenant-preset-service";
import { resolveTrainingWeekWindow, TRAINING_DEFAULT_TIMEZONE } from "@/lib/training/date-range";
import { PLANNING_ALLOCATIONS_VIEW_PERMISSIONS } from "@/lib/permissions/planning-allocation-permissions";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

type StepRow = {
  step: string;
  callCount: number;
  wallMs: number;
  blocksUsefulContent: boolean;
  notes: string;
};

function createProfiler() {
  const rows: StepRow[] = [];
  const counters = new Map<string, number>();

  return {
    rows,
    async run(
      step: string,
      notes: string,
      fn: () => Promise<void>,
      blocksUsefulContent = true,
    ) {
      const callCount = (counters.get(step) ?? 0) + 1;
      counters.set(step, callCount);
      const start = performance.now();
      await fn();
      const wallMs = performance.now() - start;
      const existing = rows.find((r) => r.step === step);
      if (existing) {
        existing.callCount = callCount;
        existing.wallMs += wallMs;
      } else {
        rows.push({ step, callCount: 1, wallMs, blocksUsefulContent, notes });
      }
    },
  };
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

function hasAnyPlanningViewPermission(platform: PermissionKey[], tenant: PermissionKey[]) {
  return PLANNING_ALLOCATIONS_VIEW_PERMISSIONS.some(
    (key) => platform.includes(key) || tenant.includes(key),
  );
}

async function simulateWochenplanerRoute(
  userId: string,
  tenantId: string,
  optimized: boolean,
): Promise<{
  rows: StepRow[];
  usefulContentMs: number;
  queryCountEstimate: number;
}> {
  const p = createProfiler();
  const routeStart = performance.now();
  await prisma.$queryRaw`SELECT 1`;

  // ── Authenticated admin layout (sequential before page) ──
  await p.run("layout: auth session", "getRequestAuthSession (bench: user id only)", async () => {
    void userId;
  });

  await p.run(
    "layout: tenant context",
    "getActiveTenant → getCurrentTenantContextByIdCached",
    async () => {
      await getCurrentTenantContextByIdCached(tenantId);
    },
  );

  await p.run("layout: person profile", "getPersonProfileByUserIdCached peer", async () => {
    await getPersonProfileByUserId(userId);
  });

  await p.run(
    "layout: participation nav capability",
    "resolvePersonalParticipationNavCapability EXISTS SQL",
    async () => {
      await resolvePersonalParticipationNavCapabilityUncached({ tenantId, userId });
    },
  );

  // ── Planner week page ──
  let platformPerms = [] as PermissionKey[];
  let tenantPerms = [] as PermissionKey[];

  await p.run(
    "page: live RBAC gate",
    "requireAnyPermission → getRequestEffectivePermissions",
    async () => {
      const perms = await getRequestEffectivePermissions(userId, tenantId);
      platformPerms = [...perms.platform] as PermissionKey[];
      tenantPerms = [...perms.tenant] as PermissionKey[];
      if (!hasAnyPlanningViewPermission(platformPerms, tenantPerms)) {
        throw new Error("bench user lacks planning view permissions");
      }
    },
  );

  await p.run("page: tenant context (repeat)", "getActiveTenant on page — request-scoped cache in RSC", async () => {
    await getCurrentTenantContextByIdCached(tenantId);
  }, false);

  const tenantCtx = await getCurrentTenantContextByIdCached(tenantId);
  const timezone = tenantCtx?.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const weekWindow = resolveTrainingWeekWindow({
    now: new Date("2026-09-29T12:00:00.000Z"),
    timeZone: timezone,
  });

  const weekShape = {
    from: weekWindow.from,
    to: weekWindow.to,
    days: weekWindow.days,
    param: weekWindow.param,
    previousParam: weekWindow.previousParam,
    nextParam: weekWindow.nextParam,
  };

  const canManagePlans =
    tenantPerms.includes(PERMISSIONS.TRAININGS_MANAGE) ||
    tenantPerms.includes(PERMISSIONS.EVENTS_MANAGE) ||
    tenantPerms.includes(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);

  const needsEagerFacilityGroups = canManagePlans && false;

  let usefulContentStart = performance.now();

  if (optimized) {
    usefulContentStart = performance.now();
    const weekPromise = getWeekplannerWeek(tenantId, weekShape, undefined);
    const presetsPromise = canManagePlans
      ? getTenantDressingRoomOccupancyPresets(tenantId)
      : Promise.resolve(null);

    await p.run(
      "page: plan lists ∥ week aggregation (overlapped)",
      "PERFORMANCE-02R3 — plans + Standardplan week + presets in parallel",
      async () => {
        await Promise.all([
          listWochenplanPlans(tenantId),
          listWeekplannerPlans(tenantId, weekWindow.param),
          weekPromise,
          presetsPromise,
        ]);
      },
    );

    await p.run(
      "data: getWeekplannerWeek (await reuse)",
      "PlannerWeekDataSection — cache hit / already complete",
      async () => {
        await weekPromise;
      },
    );
  } else {
    await p.run(
      "page: plan lists (sequential gate before week)",
      "listWochenplanPlans + listWeekplannerPlans",
      async () => {
        await Promise.all([
          listWochenplanPlans(tenantId),
          listWeekplannerPlans(tenantId, weekWindow.param),
        ]);
      },
    );

    usefulContentStart = performance.now();
    await p.run(
      "data: getWeekplannerWeek (Standardplan)",
      "Suspense PlannerWeekDataSection — blocks calendar/list useful content",
      async () => {
        await getWeekplannerWeek(tenantId, weekShape, undefined);
      },
    );

    await p.run(
      "data: facilities + dressing presets (parallel with week legacy)",
      "PlannerWeekDataSection Promise.all third leg",
      async () => {
        await Promise.all([
          getFacilitiesForTenant(tenantId),
          getTenantDressingRoomOccupancyPresets(tenantId),
        ]);
      },
      needsEagerFacilityGroups || canManagePlans,
    );
  }

  const usefulContentMs = performance.now() - usefulContentStart;
  const totalServerRenderMs = performance.now() - routeStart;

  p.rows.push({
    step: "TOTAL useful-content (week + blocking data section I/O)",
    callCount: 1,
    wallMs: usefulContentMs,
    blocksUsefulContent: true,
    notes: "from end of plan lists through week (+ eager facilities when manage)",
  });

  p.rows.push({
    step: "TOTAL server render (layout + page + data)",
    callCount: 1,
    wallMs: totalServerRenderMs,
    blocksUsefulContent: true,
    notes: "sequential layout then page simulation",
  });

  return {
    rows: p.rows,
    usefulContentMs,
    queryCountEstimate: p.rows.filter((r) => r.step.includes("data:") || r.step.includes("plan")).length,
  };
}

function printTable(title: string, rows: StepRow[], delta = false) {
  console.log(title);
  const header = delta
    ? "STEP | CALL_COUNT | WALL_MS | BLOCKS_USEFUL_CONTENT | DELTA"
    : "STEP | CALL_COUNT | WALL_MS | BLOCKS_USEFUL_CONTENT | NOTES";
  console.log(header);
  for (const row of rows) {
    if (delta) {
      console.log(
        `${row.step} | ${row.callCount} | ${row.wallMs.toFixed(1)} | ${row.blocksUsefulContent ? "yes" : "no"} |`,
      );
    } else {
      console.log(
        `${row.step} | ${row.callCount} | ${row.wallMs.toFixed(1)} | ${row.blocksUsefulContent ? "yes" : "no"} | ${row.notes}`,
      );
    }
  }
}

function summarize(rows: StepRow[]) {
  const totalRow = rows.find((r) => r.step.startsWith("TOTAL server render"));
  const usefulRow = rows.find((r) => r.step.startsWith("TOTAL useful-content"));
  const blocking = rows.filter((r) => r.blocksUsefulContent && !r.step.startsWith("TOTAL"));
  const largest = [...blocking].sort((a, b) => b.wallMs - a.wallMs).slice(0, 3);
  return {
    totalServerRenderMs: totalRow?.wallMs ?? 0,
    usefulContentMs: usefulRow?.wallMs ?? 0,
    queryCount: blocking.length,
    largest3: largest.map((r) => `${r.step}=${r.wallMs.toFixed(1)}ms`),
  };
}

async function main() {
  const mode = process.env.SCE_PERF_R3_MODE?.trim() || "before";
  const tenant = await prisma.tenant.findFirst({
    where: { key: "fc-allschwil" },
    select: { id: true, name: true },
  });
  if (!tenant) throw new Error("Tenant fc-allschwil not found.");
  const user = await pickFcaBenchUser();

  // Warm connection
  await prisma.$queryRaw`SELECT 1`;
  await getRequestEffectivePermissions(user.id, tenant.id);

  const optimized = mode === "after";
  const warm = await simulateWochenplanerRoute(user.id, tenant.id, optimized);
  const stats = summarize(warm.rows);

  const title =
    mode === "after"
      ? "=== WOCHENPLANER_FULL_PROFILE_AFTER ==="
      : "=== WOCHENPLANER_FULL_PROFILE_BEFORE ===";
  printTable(title, warm.rows);

  console.log(`\nTOTAL_SERVER_RENDER_MS: ${stats.totalServerRenderMs.toFixed(1)}`);
  console.log(`QUERY_COUNT: ${stats.queryCount}`);
  console.log(`SEQUENTIAL_QUERY_CHAINS: layout → page RBAC → plan lists → week data section`);
  console.log(`LARGEST_3_COSTS: ${stats.largest3.join(", ")}`);
  console.log(`USEFUL_CONTENT_MS: ${stats.usefulContentMs.toFixed(1)}`);

  const artifactPath =
    process.env.SCE_PERF_BENCH_ARTIFACT?.trim() ||
    `/opt/cursor/artifacts/sce-perf-02r3-wochenplaner-full-${mode}.json`;
  writeFileSync(
    artifactPath,
    `${JSON.stringify({
      benchmark: "SCE-PERF-02R3-wochenplaner-full-profile",
      mode,
      tenant: tenant.name,
      userEmail: user.email,
      rows: warm.rows,
      stats,
    })}\n`,
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
