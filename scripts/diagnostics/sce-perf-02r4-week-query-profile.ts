/**
 * SCE-PERF-02R4 — getWeekplannerWeek internal decomposition (read-only).
 */
import "dotenv/config";

process.env.SCE_PERF_WEEK_QUERY_PROFILE = "1";
process.env.SCE_PERF_TIMING = "1";

import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { getWeekplannerWeek } from "@/lib/weekplanner/queries";
import {
  formatWeekQueryProfileTable,
  getLastCompletedWeekQueryProfileReport,
} from "@/lib/diagnostics/week-query-profile";
import { resolveTrainingWeekWindow } from "@/lib/training/date-range";

async function main() {
  const artifactPath =
    process.env.SCE_PERF_R4_ARTIFACT?.trim() ||
    "/opt/cursor/artifacts/sce-perf-02r4-week-query-profile.json";

  const tenant = await prisma.tenant.findFirst({
    where: { key: "fc-allschwil" },
    select: { id: true, key: true },
  });
  if (!tenant) throw new Error("fc-allschwil tenant not found");

  const weekWindow = resolveTrainingWeekWindow({
    weekParam: process.env.SCE_PERF_WEEK_PARAM?.trim() || "2026-09-28",
    timeZone: "Europe/Zurich",
    now: new Date("2026-09-29T12:00:00.000Z"),
  });

  const weekShape = {
    from: weekWindow.from,
    to: weekWindow.to,
    days: weekWindow.days,
    param: weekWindow.param,
    previousParam: weekWindow.previousParam,
    nextParam: weekWindow.nextParam,
  };

  await getWeekplannerWeek(tenant.id, weekShape, undefined);

  const start = performance.now();
  const week = await getWeekplannerWeek(tenant.id, weekShape, undefined);
  const totalMs = performance.now() - start;
  const report = getLastCompletedWeekQueryProfileReport();

  const itemCount = week.days.reduce((n, d) => n + d.items.length, 0);
  const payload = {
    benchmark: "SCE-PERF-02R4-week-query-profile",
    tenantKey: tenant.key,
    weekParam: weekWindow.param,
    itemCount,
    warmGetWeekplannerWeekMs: Number(totalMs.toFixed(1)),
    profileTable: report ? formatWeekQueryProfileTable(report) : null,
    report,
  };

  console.log(JSON.stringify(payload, null, 2));
  writeFileSync(artifactPath, `${JSON.stringify(payload)}\n`);
  console.error(`artifact: ${artifactPath}`);
}

main().finally(() => prisma.$disconnect());
