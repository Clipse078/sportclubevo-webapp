/**
 * SCE-PERF-02B1 — classify week dataset (tournaments, trainings, matches).
 */
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { resolveTrainingWeekWindow } from "@/lib/training/date-range";
import { listTournaments } from "@/lib/tournaments/tournament-service";
import { listTrainingSessions } from "@/lib/training/session-generation-service";
import { listMatchcenterMatches } from "@/lib/matchcenter/query-service";
import { getTenantMatchOperationalPolicyCached } from "@/lib/server/request-cache";
import { getWeekplannerWeek } from "@/lib/weekplanner/queries";

async function probeWeek(tenantId: string, weekParam: string) {
  const w = resolveTrainingWeekWindow({
    weekParam,
    timeZone: "Europe/Zurich",
    now: new Date("2026-09-29T12:00:00.000Z"),
  });
  const dateFrom = new Date(`${w.days[0]}T00:00:00.000Z`);
  const dateTo = new Date(`${w.days[w.days.length - 1]}T00:00:00.000Z`);
  const policy = await getTenantMatchOperationalPolicyCached(tenantId);

  const [allTournaments, windowTournaments, sessions, matches, week] = await Promise.all([
    listTournaments(tenantId),
    listTournaments(tenantId, { overlapsWindow: { from: w.from, to: w.to } }).catch(
      () => null,
    ),
    listTrainingSessions(tenantId, { dateFrom, dateTo }),
    listMatchcenterMatches(prisma as never, {
      tenantId,
      from: w.from,
      to: w.to,
      matchOperationalPolicy: policy,
    }),
    getWeekplannerWeek(
      tenantId,
      {
        from: w.from,
        to: w.to,
        days: w.days,
        param: w.param,
        previousParam: w.previousParam,
        nextParam: w.nextParam,
      },
      undefined,
    ),
  ]);

  const homeInWindow = (windowTournaments ?? allTournaments).filter(
    (t) =>
      t.homeAway === "HOME" &&
      t.status.trim().toUpperCase() !== "CANCELLED" &&
      t.status.trim().toUpperCase() !== "CANCELED",
  );

  const itemTypes = week.days.flatMap((d) => d.items.map((i) => i.type));
  const counts = itemTypes.reduce(
    (acc, t) => {
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(
    JSON.stringify({
      weekParam,
      windowFrom: w.from.toISOString(),
      windowTo: w.to.toISOString(),
      allTournaments: allTournaments.length,
      windowTournaments: windowTournaments?.length ?? null,
      homeTournamentsInWindow: homeInWindow.length,
      trainingSessions: sessions.length,
      matchcenterMatches: matches.length,
      weekplannerItems: week.days.reduce((n, d) => n + d.items.length, 0),
      weekplannerItemTypes: counts,
    }),
  );
}

async function main() {
  const weeks = (process.env.SCE_PERF_WEEKS?.trim() || "2026-09-28,2026-09-21,2026-10-05,2026-01-05")
    .split(",")
    .map((s) => s.trim());
  const tenant = (
    await prisma.tenant.findFirst({ where: { key: "fc-allschwil" }, select: { id: true } })
  )!.id;
  for (const weekParam of weeks) {
    await probeWeek(tenant, weekParam);
  }
}

main().finally(() => prisma.$disconnect());
