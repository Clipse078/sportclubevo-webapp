/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D R2 — read-only STAGE readiness scan for Human UAT.
 *
 * Run:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   ./node_modules/.bin/tsx scripts/match-squad-01d-r2-uat-readiness.ts
 */

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

const STAGE_FP = "acd3b37682911890";
const TENANT_ID = "cmomwboak0000tsf3zzivrs46";
const B1_TEAM_SEASON_ID = "cmsoczv2t000504juhvod5hi9";
const B2_TEAM_SEASON_ID = "cmsoczvt0000604ju1f1eindm";

const TESTSPIELER_PREFIX = "SCE Testspieler";

function assertStage(): void {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL missing");
  const u = new URL(url);
  const db = decodeURIComponent(u.pathname.replace(/^\//, ""));
  const fp = createHash("sha256")
    .update(`${u.hostname.toLowerCase()}:${db}`)
    .digest("hex")
    .slice(0, 16);
  if (fp !== STAGE_FP) {
    throw new Error(`Refusing: fingerprint ${fp} !== STAGE ${STAGE_FP}`);
  }
}

async function main(): Promise<void> {
  assertStage();

  const players = await prisma.person.findMany({
    where: {
      tenantId: TENANT_ID,
      OR: [
        { displayName: { startsWith: TESTSPIELER_PREFIX } },
        { lastName: { startsWith: "Testspieler" } },
      ],
    },
    select: { id: true, displayName: true, firstName: true, lastName: true },
    take: 20,
  });

  const now = new Date();
  const horizon = new Date(now.getTime() + 56 * 86400000);

  for (const [label, teamSeasonId] of [
    ["B2", B2_TEAM_SEASON_ID],
    ["A2", await prisma.teamSeason.findFirst({
      where: {
        team: { tenantId: TENANT_ID, name: { contains: "A2", mode: "insensitive" } },
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    }).then((row) => row?.id ?? "missing")],
  ] as const) {
    const events = await prisma.event.findMany({
      where: {
        tenantId: TENANT_ID,
        teamSeasonId,
        type: "MATCH",
        startAt: { gte: now, lte: horizon },
        status: { notIn: ["CANCELLED", "POSTPONED"] },
      },
      select: { id: true, title: true, startAt: true },
      orderBy: { startAt: "asc" },
      take: 3,
    });
    console.log(`[R2 UAT] ${label} upcoming matches:`, events);
  }

  console.log("[R2 UAT] Controlled players:", players);
  console.log("[R2 UAT] Source B1 teamSeasonId:", B1_TEAM_SEASON_ID);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
