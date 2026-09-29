/**
 * SCE-PERF-02 read-only server-path benchmark (local Node against configured DATABASE_URL).
 * Avoids Wochenplan materialization (?plan= non-default) which can write.
 */
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { getWeekplannerWeek } from "@/lib/weekplanner/queries";
import { listWochenplanPlans } from "@/lib/wochenplan/plan-service";
import { listWeekplannerPlans } from "@/lib/weekplanner/plan-service";
import { listTrainingSeries } from "@/lib/training/training-service";
import { listAllocationsGroupedBySeries } from "@/lib/training/training-allocation-service";
import { resolveTrainingWeekWindow } from "@/lib/training/date-range";
import { summarizeLatency } from "@/lib/diagnostics/sce-perf-stats";

function logLine(payload: unknown, sink: string[]) {
  const line = JSON.stringify(payload);
  console.log(line);
  sink.push(line);
}

async function main() {
  const artifactPath =
    process.env.SCE_PERF_BENCH_ARTIFACT?.trim() ||
    "/opt/cursor/artifacts/sce-perf-02a-server-bench.jsonl";
  const lines: string[] = [];

  const tenants = await prisma.tenant.findMany({
    select: { id: true, key: true, name: true },
  });
  const tenant =
    tenants.find(
      (t) => (t.key ?? "").includes("fca") || (t.name ?? "").includes("Allschwil"),
    ) ?? tenants[0];
  if (!tenant) throw new Error("no tenant");

  const timezone = "Europe/Zurich";
  const now = new Date();
  const weekWindow = resolveTrainingWeekWindow({ now, timeZone: timezone });

  logLine(
    {
      benchmark: "SCE-PERF-02-readonly-bench",
      tenantId: tenant.id,
      tenantKey: tenant.key,
      weekParam: weekWindow.param,
      conditions:
        "Node local, pooled DATABASE_URL, Standardplan (planId undefined)",
    },
    lines,
  );

  const weekShape = {
    from: weekWindow.from,
    to: weekWindow.to,
    days: weekWindow.days,
    param: weekWindow.param,
    previousParam: weekWindow.previousParam,
    nextParam: weekWindow.nextParam,
  };

  const warmPlanner: number[] = [];
  const warmTraining: number[] = [];
  const weekNav: number[] = [];
  const weekTransitions: number[] = [];

  const t0 = performance.now();
  const weekCold = await getWeekplannerWeek(tenant.id, weekShape, undefined);
  logLine(
    {
      label: "planner_week_cold",
      durationMs: Number((performance.now() - t0).toFixed(1)),
      itemCount: weekCold.days.reduce((n, d) => n + d.items.length, 0),
    },
    lines,
  );

  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    await getWeekplannerWeek(tenant.id, weekShape, undefined);
    warmPlanner.push(performance.now() - start);
  }
  logLine(summarizeLatency("planner_week_warm_getWeekplannerWeek", warmPlanner), lines);

  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    await Promise.all([
      listWochenplanPlans(tenant.id),
      listWeekplannerPlans(tenant.id, weekWindow.param),
    ]);
    weekNav.push(performance.now() - start);
  }
  logLine(summarizeLatency("planner_page_plans_parallel", weekNav), lines);

  const prevWeek = resolveTrainingWeekWindow({
    weekParam: weekWindow.previousParam,
    now,
    timeZone: timezone,
  });
  const nextWeek = resolveTrainingWeekWindow({
    weekParam: weekWindow.nextParam,
    now,
    timeZone: timezone,
  });

  for (let i = 0; i < 30; i++) {
    const prevStart = performance.now();
    await getWeekplannerWeek(
      tenant.id,
      {
        from: prevWeek.from,
        to: prevWeek.to,
        days: prevWeek.days,
        param: prevWeek.param,
        previousParam: prevWeek.previousParam,
        nextParam: prevWeek.nextParam,
      },
      undefined,
    );
    weekTransitions.push(performance.now() - prevStart);

    const nextStart = performance.now();
    await getWeekplannerWeek(
      tenant.id,
      {
        from: nextWeek.from,
        to: nextWeek.to,
        days: nextWeek.days,
        param: nextWeek.param,
        previousParam: nextWeek.previousParam,
        nextParam: nextWeek.nextParam,
      },
      undefined,
    );
    weekTransitions.push(performance.now() - nextStart);
  }
  logLine(
    summarizeLatency("planner_week_transition_prev_or_next", weekTransitions),
    lines,
  );

  const tt0 = performance.now();
  await Promise.all([
    listTrainingSeries(tenant.id, { includeArchived: true }),
    listAllocationsGroupedBySeries(tenant.id),
  ]);
  logLine(
    {
      label: "training_core_cold",
      durationMs: Number((performance.now() - tt0).toFixed(1)),
    },
    lines,
  );

  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    await Promise.all([
      listTrainingSeries(tenant.id, { includeArchived: true }),
      listAllocationsGroupedBySeries(tenant.id),
    ]);
    warmTraining.push(performance.now() - start);
  }
  logLine(summarizeLatency("training_warm_core_queries", warmTraining), lines);

  writeFileSync(artifactPath, `${lines.join("\n")}\n`);
  console.log(JSON.stringify({ artifactPath, lines: lines.length }));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
