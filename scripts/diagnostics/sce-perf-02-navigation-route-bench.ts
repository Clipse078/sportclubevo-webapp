/**
 * SCE-PERF-02 — server-side navigation data-path benchmark (FCA tenant).
 * Measures route loader work for warm repeat invocations within one process.
 */
import "dotenv/config";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { getCmsOverviewStats } from "@/lib/cms/overview-stats";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { buildAdminHubGroupsForUser } from "@/lib/nav/admin-hub-catalog";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { summarizeLatency } from "@/lib/diagnostics/sce-perf-stats";
import { resolveCommunicationHubCapabilityAccess } from "@/lib/communication/hub-access";
import { listWeekplannerPlans } from "@/lib/weekplanner/plan-service";
import { listWochenplanPlans } from "@/lib/wochenplan/plan-service";

type RouteBenchRow = {
  route: string;
  firstVisitMs: number;
  repeatVisitMs: number;
  dominantCost: string;
  notes: string;
};

async function pickFcaBenchUser() {
  const email = process.env.SCE_PERF_AUTH_EMAIL?.trim() || "it@fcallschwil.ch";
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new Error(`Benchmark user not found (${email}).`);
  }
  return user;
}

async function benchAdminHub(userId: string, tenantId: string) {
  const firstStart = performance.now();
  const first = await getRequestEffectivePermissions(userId, tenantId);
  buildAdminHubGroupsForUser([
    ...new Set([...first.platform, ...first.tenant]),
  ] as PermissionKey[]);
  const firstVisitMs = performance.now() - firstStart;

  const repeatStart = performance.now();
  const repeat = await getRequestEffectivePermissions(userId, tenantId);
  buildAdminHubGroupsForUser([
    ...new Set([...repeat.platform, ...repeat.tenant]),
  ] as PermissionKey[]);
  const repeatVisitMs = performance.now() - repeatStart;

  return { firstVisitMs, repeatVisitMs };
}

async function benchWebsiteHub(tenantId: string) {
  const firstStart = performance.now();
  await getCmsOverviewStats(tenantId);
  const firstVisitMs = performance.now() - firstStart;

  const repeatStart = performance.now();
  await getCmsOverviewStats(tenantId);
  const repeatVisitMs = performance.now() - repeatStart;

  return { firstVisitMs, repeatVisitMs };
}

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { key: "fc-allschwil" },
    select: { id: true, name: true },
  });
  if (!tenant) {
    throw new Error("Tenant fc-allschwil not found.");
  }

  const user = await pickFcaBenchUser();
  const rows: RouteBenchRow[] = [];

  const admin = await benchAdminHub(user.id, tenant.id);
  rows.push({
    route: "/dashboard/admin",
    firstVisitMs: Number(admin.firstVisitMs.toFixed(1)),
    repeatVisitMs: Number(admin.repeatVisitMs.toFixed(1)),
    dominantCost: "live RBAC + admin hub grouping",
    notes: "Server data path only (excludes RSC flight + JS chunks)",
  });

  const website = await benchWebsiteHub(tenant.id);
  rows.push({
    route: "/dashboard/website",
    firstVisitMs: Number(website.firstVisitMs.toFixed(1)),
    repeatVisitMs: Number(website.repeatVisitMs.toFixed(1)),
    dominantCost: "CMS overview aggregate queries",
    notes: "Single-round-trip SQL; warm PG cache helps repeat",
  });

  const planningBench = async () => {
    const runPlanningPath = async () => {
      await getRequestEffectivePermissions(user.id, tenant.id);
      await Promise.all([
        listWochenplanPlans(tenant.id),
        listWeekplannerPlans(tenant.id, ""),
      ]);
    };
    const firstStart = performance.now();
    await runPlanningPath();
    const firstVisitMs = performance.now() - firstStart;
    const repeatStart = performance.now();
    await runPlanningPath();
    const repeatVisitMs = performance.now() - repeatStart;
    return { firstVisitMs, repeatVisitMs };
  };

  const communicationBench = async () => {
    const firstStart = performance.now();
    const first = await getRequestEffectivePermissions(user.id, tenant.id);
    resolveCommunicationHubCapabilityAccess(first.tenant);
    const firstVisitMs = performance.now() - firstStart;
    const repeatStart = performance.now();
    const repeat = await getRequestEffectivePermissions(user.id, tenant.id);
    resolveCommunicationHubCapabilityAccess(repeat.tenant);
    const repeatVisitMs = performance.now() - repeatStart;
    return { firstVisitMs, repeatVisitMs };
  };

  const planning = await planningBench();
  rows.push({
    route: "/dashboard/planner/week",
    firstVisitMs: Number(planning.firstVisitMs.toFixed(1)),
    repeatVisitMs: Number(planning.repeatVisitMs.toFixed(1)),
    dominantCost: "live RBAC + plan list queries",
    notes: "SERVER_PATH_MS — default Planung L1 destination",
  });

  const communication = await communicationBench();
  rows.push({
    route: "/dashboard/communication",
    firstVisitMs: Number(communication.firstVisitMs.toFixed(1)),
    repeatVisitMs: Number(communication.repeatVisitMs.toFixed(1)),
    dominantCost: "live RBAC + hub capability map",
    notes: "SERVER_PATH_MS — hub cards are static; RBAC dominates",
  });

  const artifactPath =
    process.env.SCE_PERF_BENCH_ARTIFACT?.trim() ||
    "/opt/cursor/artifacts/sce-perf-02-navigation-route-bench.json";

  const payload = {
    benchmark: "SCE-PERF-02-navigation-route-bench",
    tenant: tenant.name,
    userEmail: user.email,
    rows,
    adminLatency: summarizeLatency("admin", [admin.firstVisitMs, admin.repeatVisitMs]),
    websiteLatency: summarizeLatency("website", [website.firstVisitMs, website.repeatVisitMs]),
  };

  console.log(JSON.stringify(payload, null, 2));
  writeFileSync(artifactPath, `${JSON.stringify(payload)}\n`, "utf8");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
