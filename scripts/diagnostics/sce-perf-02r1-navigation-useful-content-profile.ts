/**
 * SCE-PERF-02R1 — decompose server useful-content paths (FCA tenant).
 * Set SCE_PERF_BENCH_ARTIFACT to write JSON summary.
 */
import "dotenv/config";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { getPersonProfileByUserId } from "@/lib/people/queries";
import { resolvePersonalParticipationNavCapabilityUncached } from "@/lib/personal-actions/access";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";
import { getCurrentTenantContextById } from "@/lib/tenants/context";
import { buildAdminHubGroupsForUser } from "@/lib/nav/admin-hub-catalog";
import { getCmsOverviewStats } from "@/lib/cms/overview-stats";
import { COMMUNICATION_HUB_ROUTE_PERMISSIONS } from "@/lib/communication/hub-access";
import { resolveCommunicationHubCapabilityAccess } from "@/lib/communication/hub-access";
import { PLANNING_ALLOCATIONS_VIEW_PERMISSIONS } from "@/lib/permissions/planning-allocation-permissions";
import { listWeekplannerPlans } from "@/lib/weekplanner/plan-service";
import { listWochenplanPlans } from "@/lib/wochenplan/plan-service";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

type StepRow = {
  step: string;
  callCount: number;
  totalMs: number;
  notes: string;
};

type ProfileTable = StepRow[];

function createProfiler(): {
  rows: ProfileTable;
  run: <T>(step: string, notes: string, fn: () => Promise<T>) => Promise<T>;
  totalMs: () => number;
} {
  const rows: ProfileTable = [];
  const startedAt = performance.now();
  const counters = new Map<string, number>();

  return {
    rows,
    async run(step, notes, fn) {
      const callCount = (counters.get(step) ?? 0) + 1;
      counters.set(step, callCount);
      const s = performance.now();
      const result = await fn();
      const existing = rows.find((r) => r.step === step);
      const durationMs = performance.now() - s;
      if (existing) {
        existing.callCount = callCount;
        existing.totalMs += durationMs;
      } else {
        rows.push({ step, callCount: 1, totalMs: durationMs, notes });
      }
      return result;
    },
    totalMs: () => performance.now() - startedAt,
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

async function profileAdminUsefulContent(
  userId: string,
  tenantId: string,
): Promise<ProfileTable> {
  const p = createProfiler();

  await p.run(
    "authenticated session",
    "bench uses prisma user id (RSC path uses getRequestAuthSession)",
    async () => userId,
  );

  await p.run("tenant context", "tenant row by active tenant id", () =>
    getCurrentTenantContextById(tenantId),
  );
  await p.run("person profile", "linked person for shell identity", () =>
    getPersonProfileByUserId(userId),
  );
  await p.run("participation nav capability", "person/guardian/squad probes", () =>
    tenantId
      ? resolvePersonalParticipationNavCapabilityUncached({ tenantId, userId })
      : Promise.resolve(false),
  );

  const permissions = await p.run(
    "live RBAC resolution",
    "EffectivePermissionResolver.getEffectivePermissions",
    () => createEffectivePermissionResolver(prisma).getEffectivePermissions({ userId, tenantId }),
  );

  await p.run("admin area + hub permission evaluation", "requireAnyPermission checks (in-memory)", async () => {
    const keys = [...permissions.platform, ...permissions.tenant];
    const adminAreaAllowed = TENANT_ADMINISTRATION_PERMISSIONS.some((key) => keys.includes(key));
    const hubAllowed = TENANT_ADMINISTRATION_PERMISSIONS.some((key) => keys.includes(key));
    if (!adminAreaAllowed || !hubAllowed) {
      throw new Error("bench user lacks tenant administration permissions");
    }
  });

  await p.run("admin hub grouping", "buildAdminHubGroupsForUser (in-memory)", async () => {
    const keys = [...new Set([...permissions.platform, ...permissions.tenant])] as PermissionKey[];
    buildAdminHubGroupsForUser(keys);
  });

  p.rows.push({
    step: "TOTAL useful-content path",
    callCount: 1,
    totalMs: p.totalMs(),
    notes: "SERVER_PATH_MS — simulates shell + admin gates + hub catalog (no RSC flight)",
  });

  return p.rows;
}

async function profileWebsiteUsefulContent(tenantId: string): Promise<ProfileTable> {
  const p = createProfiler();
  await p.run("website gate", "NEWS/WEBSITE permission check (in-memory)", async () => {
    const perms = await createEffectivePermissionResolver(prisma).getEffectivePermissions({
      userId: (await pickFcaBenchUser()).id,
      tenantId,
    });
    const keys = [...perms.platform, ...perms.tenant];
    if (!keys.includes(PERMISSIONS.NEWS_MANAGE) && !keys.includes(PERMISSIONS.WEBSITE_MANAGE)) {
      throw new Error("bench user lacks website permissions");
    }
  });
  await p.run("CMS overview aggregates", "single-round-trip status + meta SQL", () =>
    tenantId ? getCmsOverviewStats(tenantId) : Promise.resolve(null),
  );

  p.rows.push({
    step: "TOTAL useful-content path",
    callCount: 1,
    totalMs: p.totalMs(),
    notes: "SERVER_PATH_MS — website hub stats only (excludes shell unless shared)",
  });

  return p.rows;
}

async function benchRoute(
  label: string,
  fn: () => Promise<void>,
): Promise<{ firstVisitMs: number; repeatVisitMs: number }> {
  const firstStart = performance.now();
  await fn();
  const firstVisitMs = performance.now() - firstStart;

  const repeatStart = performance.now();
  await fn();
  const repeatVisitMs = performance.now() - repeatStart;

  return {
    firstVisitMs: Number(firstVisitMs.toFixed(1)),
    repeatVisitMs: Number(repeatVisitMs.toFixed(1)),
  };
}

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { key: "fc-allschwil" },
    select: { id: true, name: true },
  });
  if (!tenant) throw new Error("Tenant fc-allschwil not found.");
  const user = await pickFcaBenchUser();

  console.log("=== ADMIN_PROFILE ===");
  const adminProfile = await profileAdminUsefulContent(user.id, tenant.id);
  for (const row of adminProfile) {
    console.log(
      `${row.step} | ${row.callCount} | ${row.totalMs.toFixed(1)} | ${row.notes}`,
    );
  }

  console.log("\n=== WEBSITE_PROFILE ===");
  const websiteProfile = await profileWebsiteUsefulContent(tenant.id);
  for (const row of websiteProfile) {
    console.log(
      `${row.step} | ${row.callCount} | ${row.totalMs.toFixed(1)} | ${row.notes}`,
    );
  }

  const adminData = async () => {
    const perms = await getRequestEffectivePermissions(user.id, tenant.id);
    buildAdminHubGroupsForUser([
      ...new Set([...perms.platform, ...perms.tenant]),
    ] as PermissionKey[]);
  };

  const websiteData = async () => {
    await getCmsOverviewStats(tenant.id);
  };

  const planningData = async () => {
    await getRequestEffectivePermissions(user.id, tenant.id);
    await listWochenplanPlans(tenant.id);
    await listWeekplannerPlans(tenant.id, "");
  };

  const communicationData = async () => {
    const { tenant: tenantPerms } = await getRequestEffectivePermissions(user.id, tenant.id);
    resolveCommunicationHubCapabilityAccess(tenantPerms);
  };

  const matrix = [
    { route: "/dashboard/admin", ...(await benchRoute("admin", adminData)) },
    { route: "/dashboard/website", ...(await benchRoute("website", websiteData)) },
    { route: "/dashboard/planner/week", ...(await benchRoute("planning", planningData)) },
    {
      route: "/dashboard/communication",
      ...(await benchRoute("communication", communicationData)),
    },
  ];

  console.log("\n=== PERFORMANCE_MATRIX ===");
  for (const row of matrix) {
    console.log(
      `${row.route} | first=${row.firstVisitMs} | repeat=${row.repeatVisitMs} | SERVER_PATH_MS`,
    );
  }

  const artifactPath =
    process.env.SCE_PERF_BENCH_ARTIFACT?.trim() ||
    "/opt/cursor/artifacts/sce-perf-02r1-navigation-profile.json";

  writeFileSync(
    artifactPath,
    `${JSON.stringify({
      benchmark: "SCE-PERF-02R1-navigation-useful-content-profile",
      tenant: tenant.name,
      userEmail: user.email,
      adminProfile,
      websiteProfile,
      matrix,
    })}\n`,
    "utf8",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
