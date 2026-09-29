/**
 * SCE-PERF-02B1 — one warm sample of getWeekplannerWeek (read-only, Standardplan).
 * Used by run-sce-perf-02b1-comparative.sh; prints one JSON line.
 */
import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/db/prisma";
import { getWeekplannerWeek } from "@/lib/weekplanner/queries";
import { resolveTrainingWeekWindow } from "@/lib/training/date-range";

async function main() {
  const weekParam = process.env.SCE_PERF_WEEK_PARAM?.trim() || "2026-09-28";
  const impl = process.env.SCE_PERF_IMPL?.trim() || "feature";
  const tenantKey = process.env.SCE_PERF_TENANT_KEY?.trim() || "fc-allschwil";

  const tenant = await prisma.tenant.findFirst({
    where: { key: tenantKey },
    select: { id: true, key: true },
  });
  if (!tenant) throw new Error(`tenant ${tenantKey} missing`);

  const weekWindow = resolveTrainingWeekWindow({
    weekParam,
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

  const start = performance.now();
  const week = await getWeekplannerWeek(tenant.id, weekShape, undefined);
  const durationMs = Number((performance.now() - start).toFixed(1));
  const itemCount = week.days.reduce((n, d) => n + d.items.length, 0);

  console.log(
    JSON.stringify({
      impl,
      weekParam,
      tenantKey: tenant.key,
      durationMs,
      itemCount,
      ts: new Date().toISOString(),
    }),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
