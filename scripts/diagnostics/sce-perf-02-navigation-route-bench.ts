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
    notes: "Parallel groupBy counts; warm PG cache helps repeat",
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
