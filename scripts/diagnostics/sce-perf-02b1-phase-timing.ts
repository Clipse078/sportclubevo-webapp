import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/db/prisma";
import { resolveTrainingWeekWindow } from "@/lib/training/date-range";
import { listTrainingSessions } from "@/lib/training/session-generation-service";
import { listMatchcenterMatches } from "@/lib/matchcenter/query-service";
import { listTournaments } from "@/lib/tournaments/tournament-service";
import { getFacilitiesForTenantCached, getTenantMatchOperationalPolicyCached } from "@/lib/server/request-cache";

async function time(label: string, fn: () => Promise<unknown>) {
  const start = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - start);
  const count = Array.isArray(result) ? result.length : "";
  console.log(JSON.stringify({ label, ms, count }));
}

async function main() {
  const tenant = (
    await prisma.tenant.findFirst({ where: { key: "fc-allschwil" }, select: { id: true } })
  )!.id;
  const w = resolveTrainingWeekWindow({
    weekParam: "2026-09-28",
    timeZone: "Europe/Zurich",
    now: new Date(),
  });
  const dateFrom = new Date(`${w.days[0]}T00:00:00.000Z`);
  const dateTo = new Date(`${w.days[w.days.length - 1]}T00:00:00.000Z`);
  const policy = await getTenantMatchOperationalPolicyCached(tenant);

  await time("listTrainingSessions", () => listTrainingSessions(tenant, { dateFrom, dateTo }));
  await time("listMatchcenterMatches", () =>
    listMatchcenterMatches(prisma as never, {
      tenantId: tenant,
      from: w.from,
      to: w.to,
      matchOperationalPolicy: policy,
    }),
  );
  await time("listTournaments_window", () =>
    listTournaments(tenant, { overlapsWindow: { from: w.from, to: w.to } }),
  );
  await time("veranstaltungen", () =>
    prisma.event.findMany({
      where: {
        tenantId: tenant,
        type: "OTHER",
        status: { notIn: ["CANCELLED"] },
        startAt: { lt: w.to },
        OR: [{ endAt: { gt: w.from } }, { endAt: null, startAt: { gte: w.from } }],
      },
    }),
  );
  await time("facilities", () => getFacilitiesForTenantCached(tenant));
}

main()
  .finally(() => prisma.$disconnect());
