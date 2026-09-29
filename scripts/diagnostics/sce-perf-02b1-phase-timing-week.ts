/**
 * SCE-PERF-02B1 — per-source wall times for one week (read-only).
 */
import "dotenv/config";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { resolveTrainingWeekWindow } from "@/lib/training/date-range";
import { listTrainingSessions } from "@/lib/training/session-generation-service";
import { listMatchcenterMatches } from "@/lib/matchcenter/query-service";
import { listTournaments } from "@/lib/tournaments/tournament-service";
import {
  getFacilitiesForTenantCached,
  getTenantMatchOperationalPolicyCached,
  getTenantDressingRoomOccupancyPresetsCached,
} from "@/lib/server/request-cache";

async function time(label: string, fn: () => Promise<unknown>) {
  const start = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - start);
  const count = Array.isArray(result) ? result.length : null;
  return { label, ms, count };
}

async function main() {
  const weekParam = process.env.SCE_PERF_WEEK_PARAM?.trim() || "2026-09-28";
  const impl = process.env.SCE_PERF_IMPL?.trim() || "feature";
  const artifactPath =
    process.env.SCE_PERF_PHASE_ARTIFACT?.trim() ||
    `/opt/cursor/artifacts/sce-perf-02b1-phase-${impl}-${weekParam}.jsonl`;

  const tenant = (
    await prisma.tenant.findFirst({ where: { key: "fc-allschwil" }, select: { id: true } })
  )!.id;

  const w = resolveTrainingWeekWindow({
    weekParam,
    timeZone: "Europe/Zurich",
    now: new Date("2026-09-29T12:00:00.000Z"),
  });
  const dateFrom = new Date(`${w.days[0]}T00:00:00.000Z`);
  const dateTo = new Date(`${w.days[w.days.length - 1]}T00:00:00.000Z`);

  const lines: string[] = [];
  const log = (row: unknown) => {
    const line = JSON.stringify(row);
    console.log(line);
    lines.push(line);
  };

  log({ benchmark: "SCE-PERF-02B1-phase-timing", impl, weekParam });

  const prefetch = await Promise.all([
    time("prefetch_facilities", () => getFacilitiesForTenantCached(tenant)),
    time("prefetch_policy", () => getTenantMatchOperationalPolicyCached(tenant)),
    time("prefetch_presets", () => getTenantDressingRoomOccupancyPresetsCached(tenant)),
    time("prefetch_tenant_logo", () =>
      prisma.tenant.findUnique({ where: { id: tenant }, select: { logoUrl: true } }),
    ),
  ]);
  for (const row of prefetch) log(row);

  const policy = await getTenantMatchOperationalPolicyCached(tenant);

  log(
    await time("listTrainingSessions", () =>
      listTrainingSessions(tenant, { dateFrom, dateTo }),
    ),
  );
  log(
    await time("listMatchcenterMatches", () =>
      listMatchcenterMatches(prisma as never, {
        tenantId: tenant,
        from: w.from,
        to: w.to,
        matchOperationalPolicy: policy,
      }),
    ),
  );

  const tournamentsAll = await time("listTournaments_all", () => listTournaments(tenant));
  log(tournamentsAll);

  try {
    log(
      await time("listTournaments_window", () =>
        listTournaments(tenant, { overlapsWindow: { from: w.from, to: w.to } }),
      ),
    );
  } catch (err) {
    log({
      label: "listTournaments_window",
      ms: null,
      count: null,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  writeFileSync(artifactPath, `${lines.join("\n")}\n`);
  log({ artifactPath });
}

main().finally(() => prisma.$disconnect());
