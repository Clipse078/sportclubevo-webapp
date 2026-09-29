/**
 * SCE-PERF-02B1 — normalized getWeekplannerWeek snapshot for diffing baseline vs feature.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { getWeekplannerWeek } from "@/lib/weekplanner/queries";
import { resolveTrainingWeekWindow } from "@/lib/training/date-range";
import type { WeekplannerItem, WeekplannerResourceRef, WeekplannerWeek } from "@/lib/weekplanner/types";

function iso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}

function normalizeResourceRef(r: WeekplannerResourceRef) {
  return {
    facilityResourceId: r.facilityResourceId,
    facilityId: r.facilityId,
    code: r.code,
    name: r.name,
    facilityName: r.facilityName,
    resourceType: r.resourceType ?? null,
    occupancyBeforeMinutes: r.occupancyBeforeMinutes,
    occupancyAfterMinutes: r.occupancyAfterMinutes,
  };
}

function normalizeItem(item: WeekplannerItem) {
  const base = {
    id: item.id,
    tenantId: item.tenantId,
    type: item.type,
    startAt: iso(item.startAt),
    endAt: iso(item.endAt),
    canonicalStartAt: iso(item.canonicalStartAt),
    canonicalEndAt: iso(item.canonicalEndAt),
    timeOverridden: item.timeOverridden,
    title: item.title,
    teamNames: [...item.teamNames].sort(),
    pitchAllocations: item.pitchAllocations.map(normalizeResourceRef),
    dressingRoomAllocations: item.dressingRoomAllocations.map(normalizeResourceRef),
    canonicalPitchAllocations: item.canonicalPitchAllocations.map(normalizeResourceRef),
    canonicalDressingRoomAllocations: item.canonicalDressingRoomAllocations.map(
      normalizeResourceRef,
    ),
    pitchOverridden: item.pitchOverridden,
    dressingRoomOverridden: item.dressingRoomOverridden,
    conflicts: [...item.conflicts]
      .map((c) => ({
        facilityResourceId: c.facilityResourceId,
        facilityResourceName: c.facilityResourceName,
        resourceKind: c.resourceKind ?? null,
        partnerItemId: c.partnerItemId ?? null,
        partnerTitle: c.partnerTitle ?? null,
        overlapStartAt: iso(c.overlapStartAt),
        overlapEndAt: iso(c.overlapEndAt),
        occupancyStartAt: iso(c.occupancyStartAt),
        occupancyEndAt: iso(c.occupancyEndAt),
      }))
      .sort((a, b) =>
        `${a.facilityResourceId}:${a.partnerItemId}:${a.overlapStartAt}`.localeCompare(
          `${b.facilityResourceId}:${b.partnerItemId}:${b.overlapStartAt}`,
        ),
      ),
    dressingRoomOccupancyMode: item.dressingRoomOccupancyMode,
    dressingRoomOccupancyBeforeMinutes: item.dressingRoomOccupancyBeforeMinutes,
    dressingRoomOccupancyAfterMinutes: item.dressingRoomOccupancyAfterMinutes,
    dressingRoomResolvedBeforeMinutes: item.dressingRoomResolvedBeforeMinutes,
    dressingRoomResolvedAfterMinutes: item.dressingRoomResolvedAfterMinutes,
  };

  if (item.type === "TRAINING") {
    return {
      ...base,
      trainingSeriesId: item.trainingSeriesId,
      trainingSessionId: item.trainingSessionId,
      teamSeasonId: item.teamSeasonId,
    };
  }
  if (item.type === "MATCH") {
    return {
      ...base,
      eventId: item.eventId,
      opponentName: item.opponentName,
      eventSource: item.eventSource,
      homeAway: item.homeAway,
      homeSide: item.homeSide,
      awaySide: item.awaySide,
      awayDressingRoomAllocations: item.awayDressingRoomAllocations.map(normalizeResourceRef),
    };
  }
  if (item.type === "TOURNAMENT") {
    return {
      ...base,
      eventId: item.eventId,
      homeAway: item.homeAway,
      participantAllocations: item.participantAllocations.map((p) => ({
        participantId: p.participantId,
        participantLabel: p.participantLabel,
        dressingRoomAllocations: p.dressingRoomAllocations.map(normalizeResourceRef),
        canonicalDressingRoomAllocations: p.canonicalDressingRoomAllocations.map(
          normalizeResourceRef,
        ),
        dressingRoomOverridden: p.dressingRoomOverridden,
      })),
    };
  }
  return {
    ...base,
    eventId: item.eventId,
    location: item.location,
    teamSeasonId: item.teamSeasonId,
    allDay: item.allDay,
  };
}

function normalizeWeek(week: WeekplannerWeek) {
  return {
    param: week.param,
    previousParam: week.previousParam,
    nextParam: week.nextParam,
    weekNumberLabel: week.weekNumberLabel,
    rangeLabel: week.rangeLabel,
    days: week.days.map((d) => ({
      dayKey: d.dayKey,
      items: d.items.map(normalizeItem),
    })),
  };
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function main() {
  const weekParam = process.env.SCE_PERF_WEEK_PARAM?.trim() || "2026-09-28";
  const impl = process.env.SCE_PERF_IMPL?.trim() || "feature";
  const outPath = process.env.SCE_PERF_EQUIV_OUT?.trim();
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
  const week = await getWeekplannerWeek(
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

  const normalized = normalizeWeek(week);
  const payload = {
    impl,
    weekParam,
    tenantKey: tenant.key,
    itemCount: week.days.reduce((n, d) => n + d.items.length, 0),
    digest: digest(normalized),
    week: normalized,
  };

  const line = JSON.stringify(payload);
  if (outPath) {
    writeFileSync(outPath, `${line}\n`);
  }
  console.log(
    JSON.stringify({
      impl,
      weekParam,
      itemCount: payload.itemCount,
      digest: payload.digest,
      outPath: outPath ?? null,
    }),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
