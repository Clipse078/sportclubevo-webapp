/**
 * SCE-PERF-02 read-only server-path benchmark (local Node against configured DATABASE_URL).
 * Avoids Wochenplan materialization (?plan= non-default) which can write.
 */
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/db/prisma";
import { getWeekplannerWeek } from "@/lib/weekplanner/queries";
import { listWochenplanPlans } from "@/lib/wochenplan/plan-service";
import { listWeekplannerPlans } from "@/lib/weekplanner/plan-service";
import { listTrainingSeries } from "@/lib/training/training-service";
import { listAllocationsGroupedBySeries } from "@/lib/training/training-allocation-service";
import { resolveTrainingWeekWindow } from "@/lib/training/date-range";

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

function summarize(label: string, samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      label,
      n: samples.length,
      minMs: Number(sorted[0]!.toFixed(1)),
      p50Ms: Number(percentile(sorted, 50).toFixed(1)),
      p75Ms: Number(percentile(sorted, 75).toFixed(1)),
      p95Ms: Number(percentile(sorted, 95).toFixed(1)),
      maxMs: Number(sorted[sorted.length - 1]!.toFixed(1)),
    }),
  );
}

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, key: true, name: true } });
  const tenant =
    tenants.find((t) => (t.key ?? "").includes("fca") || (t.name ?? "").includes("Allschwil")) ??
    tenants[0];
  if (!tenant) throw new Error("no tenant");

  const timezone = "Europe/Zurich";
  const now = new Date();
  const weekWindow = resolveTrainingWeekWindow({ now, timeZone: timezone });

  console.log(
    JSON.stringify({
      benchmark: "SCE-PERF-02-readonly-bench",
      tenantId: tenant.id,
      tenantKey: tenant.key,
      weekParam: weekWindow.param,
      conditions: "Node local, pooled DATABASE_URL, Standardplan (planId undefined)",
    }),
  );

  const warmPlanner: number[] = [];
  const warmTraining: number[] = [];
  const weekNav: number[] = [];

  const t0 = performance.now();
  const weekCold = await getWeekplannerWeek(
    tenant.id,
    {
      from: weekWindow.from,
      to: weekWindow.to,
      days: weekWindow.days,
      param: weekWindow.param,
      previousParam: weekWindow.previousParam,
      nextParam: weekWindow.nextParam,
    },
    undefined,
  );
  console.log(
    JSON.stringify({
      label: "planner_week_cold",
      durationMs: Number((performance.now() - t0).toFixed(1)),
      itemCount: weekCold.days.reduce((n, d) => n + d.items.length, 0),
    }),
  );

  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    await getWeekplannerWeek(
      tenant.id,
      {
        from: weekWindow.from,
        to: weekWindow.to,
        days: weekWindow.days,
        param: weekWindow.param,
        previousParam: weekWindow.previousParam,
        nextParam: weekWindow.nextParam,
      },
      undefined,
    );
    warmPlanner.push(performance.now() - start);
  }
  summarize("planner_week_warm_getWeekplannerWeek", warmPlanner);

  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    await Promise.all([
      listWochenplanPlans(tenant.id),
      listWeekplannerPlans(tenant.id, weekWindow.param),
    ]);
    weekNav.push(performance.now() - start);
  }
  summarize("planner_page_plans_parallel", weekNav);

  const tt0 = performance.now();
  await Promise.all([
    listTrainingSeries(tenant.id, { includeArchived: true }),
    listAllocationsGroupedBySeries(tenant.id),
  ]);
  console.log(
    JSON.stringify({
      label: "training_core_cold",
      durationMs: Number((performance.now() - tt0).toFixed(1)),
    }),
  );

  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    await Promise.all([
      listTrainingSeries(tenant.id, { includeArchived: true }),
      listAllocationsGroupedBySeries(tenant.id),
    ]);
    warmTraining.push(performance.now() - start);
  }
  summarize("training_warm_core_queries", warmTraining);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
