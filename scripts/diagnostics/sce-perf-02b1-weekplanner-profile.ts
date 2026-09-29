/**
 * SCE-PERF-02B1 — phased read-only profile for getWeekplannerWeek.
 * Reuses sce-perf-query-metrics; no mutating paths.
 */
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { getWeekplannerWeek } from "@/lib/weekplanner/queries";
import { resolveTrainingWeekWindow } from "@/lib/training/date-range";
import { summarizeLatency } from "@/lib/diagnostics/sce-perf-stats";
import {
  createScePerfQueryMetrics,
  wrapPrismaWithScePerfQueryMetrics,
} from "@/lib/diagnostics/sce-perf-query-metrics";

function dbFingerprint(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

async function main() {
  const artifactPath =
    process.env.SCE_PERF_BENCH_ARTIFACT?.trim() ||
    "/opt/cursor/artifacts/sce-perf-02b1-weekplanner-profile.jsonl";
  const lines: string[] = [];
  const log = (payload: unknown) => {
    const line = JSON.stringify(payload);
    console.log(line);
    lines.push(line);
  };

  const dbUrl = process.env.DATABASE_URL ?? "";
  log({
    benchmark: "SCE-PERF-02B1-weekplanner-profile",
    nodeVersion: process.version,
    dbFingerprint: dbUrl ? dbFingerprint(dbUrl) : null,
    execution: "cloud-agent-vm",
  });

  const tenants = await prisma.tenant.findMany({
    select: { id: true, key: true, name: true },
  });
  const tenant =
    tenants.find(
      (t) => (t.key ?? "").includes("fca") || (t.name ?? "").includes("Allschwil"),
    ) ?? tenants[0];
  if (!tenant) throw new Error("no tenant");

  const weekWindow = resolveTrainingWeekWindow({
    now: new Date("2026-09-29T12:00:00.000Z"),
    timeZone: "Europe/Zurich",
    weekParam: "2026-09-28",
  });

  const weekShape = {
    from: weekWindow.from,
    to: weekWindow.to,
    days: weekWindow.days,
    param: weekWindow.param,
    previousParam: weekWindow.previousParam,
    nextParam: weekWindow.nextParam,
  };

  log({ tenantId: tenant.id, tenantKey: tenant.key, weekParam: weekWindow.param });

  const metrics = createScePerfQueryMetrics();
  const instrumented = wrapPrismaWithScePerfQueryMetrics(prisma, metrics);
  // Weekplanner uses module-level prisma import; profile via env + repeated wall time only.
  void instrumented;

  const coldStart = performance.now();
  const weekCold = await getWeekplannerWeek(tenant.id, weekShape, undefined);
  const itemCount = weekCold.days.reduce((n, d) => n + d.items.length, 0);
  log({
    label: "cold",
    durationMs: Number((performance.now() - coldStart).toFixed(1)),
    itemCount,
    note: "query metrics require prisma client injection; wall time only",
  });

  const warmDurations: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await getWeekplannerWeek(tenant.id, weekShape, undefined);
    warmDurations.push(performance.now() - start);
  }
  log(summarizeLatency("warm_getWeekplannerWeek", warmDurations));

  writeFileSync(artifactPath, `${lines.join("\n")}\n`);
  log({ artifactPath });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
