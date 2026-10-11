/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D — readonly STAGE UAT preflight inventory.
 * Run: APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   ./node_modules/.bin/tsx scripts/match-squad-01d-uat-preflight-readonly.ts
 */
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

const STAGE_FP = "acd3b37682911890";
const B1_TS = "cmsoczv2t000504juhvod5hi9";
const B2_TS = "cmsoczvt0000604ju1f1eindm";
const B1_TEAM = "cmrkh1mb1000i04jurtajh262";
const B2_TEAM = "cmrkh1mo4000k04ju4c4302w9";
const TENANT = "cmomwboak0000tsf3zzivrs46";
const TEST_PLAYER_IDS = [
  "cmv2m3gep0000eujsih4nx7e8", // 01
  "cmv2m4cta000akojs54x9wcpy", // 04
  "cmv2m4f42000gkojsn0owkuy1", // 06
];

function assertStage() {
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
  if (process.env.SCE_DATA_ENVIRONMENT?.toUpperCase() !== "STAGE") {
    throw new Error("Set SCE_DATA_ENVIRONMENT=STAGE");
  }
}

async function trainerRows(teamSeasonId: string) {
  return prisma.trainerTeamMember.findMany({
    where: { teamSeasonId, status: "ACTIVE" },
    select: {
      id: true,
      roleLabel: true,
      person: {
        select: {
          id: true,
          displayName: true,
          userId: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function main() {
  assertStage();

  const schemaChecks = await prisma.$queryRaw<
    { player_release_request: boolean; match_squad_enum: boolean; player_release_targeted: boolean; player_release_entity: boolean }[]
  >`
    SELECT
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PlayerReleaseRequest') AS player_release_request,
      EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'NotificationCategory' AND e.enumlabel = 'MATCH_SQUAD') AS match_squad_enum,
      EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'NotificationType' AND e.enumlabel = 'PLAYER_RELEASE_TARGETED') AS player_release_targeted,
      EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'NotificationEntityType' AND e.enumlabel = 'PLAYER_RELEASE') AS player_release_entity
  `;

  const b1Trainers = await trainerRows(B1_TS);
  const b2Trainers = await trainerRows(B2_TS);

  const squad = await prisma.playerSquadMember.findMany({
    where: {
      teamSeasonId: B1_TS,
      personId: { in: TEST_PLAYER_IDS },
    },
    select: {
      personId: true,
      status: true,
      person: { select: { displayName: true } },
    },
  });

  const releases = await prisma.playerRelease.findMany({
    where: {
      sourceTeamSeasonId: B1_TS,
      targetTeamSeasonId: B2_TS,
      personId: { in: TEST_PLAYER_IDS },
      status: "ACTIVE",
    },
    select: {
      id: true,
      personId: true,
      status: true,
      reason: true,
      maxMinutes: true,
      validFrom: true,
      validUntil: true,
      person: { select: { displayName: true } },
    },
  });

  const requests = await prisma.playerReleaseRequest.findMany({
    where: {
      sourceTeamSeasonId: B1_TS,
      targetTeamSeasonId: B2_TS,
      personId: { in: TEST_PLAYER_IDS },
    },
    select: {
      id: true,
      personId: true,
      status: true,
      targetEventId: true,
    },
  });

  const b2Matches = await prisma.event.findMany({
    where: {
      tenantId: TENANT,
      type: "MATCH",
      OR: [{ teamSeasonId: B2_TS }, { teamId: B2_TEAM }],
      status: { not: "CANCELLED" },
      startAt: { gte: new Date("2026-10-01") },
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      teamId: true,
      teamSeasonId: true,
    },
    orderBy: { startAt: "asc" },
    take: 8,
  });

  const b2Tournaments = await prisma.event.findMany({
    where: {
      tenantId: TENANT,
      type: "TOURNAMENT",
      OR: [{ teamSeasonId: B2_TS }, { teamId: B2_TEAM }],
      status: { not: "CANCELLED" },
      startAt: { gte: new Date("2026-10-01") },
    },
    select: { id: true, title: true, startAt: true, teamId: true, teamSeasonId: true },
    orderBy: { startAt: "asc" },
    take: 5,
  });

  const b3Team = await prisma.team.findFirst({
    where: {
      tenantId: TENANT,
      name: { contains: "Junioren B3", mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      teamSeasons: {
        where: { status: "ACTIVE" },
        select: { id: true, season: { select: { name: true } } },
        take: 2,
      },
    },
  });

  const staleNotifs = await prisma.notification.count({
    where: {
      tenantId: TENANT,
      type: "PLAYER_RELEASE_TARGETED",
      entityType: "PLAYER_RELEASE",
    },
  });

  console.log(
    JSON.stringify(
      {
        schemaChecks: schemaChecks[0],
        b1Trainers: b1Trainers.map((t) => ({
          roleLabel: t.roleLabel,
          personId: t.person.id,
          displayName: t.person.displayName,
          userId: t.person.userId,
          userLabel: t.person.user
            ? `${t.person.user.firstName ?? ""} ${t.person.user.lastName ?? ""}`.trim()
            : null,
          hasEmail: Boolean(t.person.user?.email),
        })),
        b2Trainers: b2Trainers.map((t) => ({
          roleLabel: t.roleLabel,
          personId: t.person.id,
          displayName: t.person.displayName,
          userId: t.person.userId,
          userLabel: t.person.user
            ? `${t.person.user.firstName ?? ""} ${t.person.user.lastName ?? ""}`.trim()
            : null,
          hasEmail: Boolean(t.person.user?.email),
        })),
        testPlayerSquadOnB1: squad,
        activeReleasesB1toB2TestPlayers: releases,
        openRequestsTestPlayers: requests,
        b2UpcomingMatches: b2Matches,
        b2UpcomingTournaments: b2Tournaments,
        b3TeamHint: b3Team,
        playerReleaseTargetedNotificationCount: staleNotifs,
        controlledMatchFromLedger: "cmrzhj3je006a04kwhbepxvdz",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
