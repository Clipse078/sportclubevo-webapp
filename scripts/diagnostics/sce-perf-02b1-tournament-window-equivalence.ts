/**
 * Verifies overlapsWindow tournament filtering matches legacy in-memory Weekplanner rules.
 */
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { resolveTrainingWeekWindow } from "@/lib/training/date-range";
import { listTournaments } from "@/lib/tournaments/tournament-service";

function isCancelled(status: string): boolean {
  const normalized = status.trim().toUpperCase();
  return normalized === "CANCELLED" || normalized === "CANCELED";
}

function legacyHomeInWindow(
  tournaments: Awaited<ReturnType<typeof listTournaments>>,
  from: Date,
  to: Date,
) {
  return tournaments
    .filter((tournament) => {
      if (tournament.homeAway !== "HOME") return false;
      if (isCancelled(tournament.status)) return false;
      const startAt = new Date(tournament.startAt).getTime();
      const endAt = tournament.endAt ? new Date(tournament.endAt).getTime() : startAt;
      return startAt < to.getTime() && endAt >= from.getTime();
    })
    .map((t) => t.id)
    .sort();
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { key: "fc-allschwil" }, select: { id: true } });
  if (!tenant) throw new Error("tenant missing");

  const weeks = ["2026-09-28", "2026-09-21", "2026-10-05", "2026-01-05"];
  const all = await listTournaments(tenant.id);

  for (const weekParam of weeks) {
    const w = resolveTrainingWeekWindow({
      weekParam,
      timeZone: "Europe/Zurich",
      now: new Date(),
    });
    const windowed = await listTournaments(tenant.id, {
      overlapsWindow: { from: w.from, to: w.to },
    });
    const legacyIds = legacyHomeInWindow(all, w.from, w.to);
    const newIds = windowed
      .filter((t) => t.homeAway === "HOME" && !isCancelled(t.status))
      .map((t) => t.id)
      .sort();
    const match = legacyIds.join(",") === newIds.join(",");
    console.log(JSON.stringify({ weekParam, legacyCount: legacyIds.length, newCount: newIds.length, match }));
    if (!match) {
      process.exitCode = 1;
    }
  }
}

main().finally(() => prisma.$disconnect());
