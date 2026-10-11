/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01F — controlled programme test-data cleanup.
 *
 * Default: DRY RUN (no writes).
 * APPLY: requires APP_ENV=stage, tenant fc-allschwil, and --apply --confirm MATCH-SQUAD-01F-CLEANUP
 *
 * Usage:
 *   npx tsx scripts/match-squad-01f-controlled-test-data-cleanup.ts
 *   npx tsx scripts/match-squad-01f-controlled-test-data-cleanup.ts --apply --confirm MATCH-SQUAD-01F-CLEANUP
 */

import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import {
  MATCH_SQUAD_CONTROLLED_PERSON_IDS,
  MATCH_SQUAD_CONTROLLED_TENANT_ID,
  MATCH_SQUAD_CONTROLLED_UAT_EVENT_IDS,
} from "@/lib/match-squad/match-squad-controlled-test-data-ledger";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const APPLY_CONFIRM = "MATCH-SQUAD-01F-CLEANUP";

type Inventory = {
  persons: { id: string; displayName: string | null }[];
  playerSquadMembers: { id: string; personId: string }[];
  participationResponses: { id: string; personId: string; eventId: string | null }[];
  playerReleases: { id: string; personId: string }[];
  playerReleaseRequests: { id: string; personId: string }[];
  matchSquadMembers: { id: string; personId: string; playerReleaseRequestId: string | null }[];
  notifications: { id: string; type: string }[];
  notificationDeliveries: { id: string; notificationId: string }[];
};

async function loadInventory(): Promise<Inventory> {
  const persons = await prisma.person.findMany({
    where: {
      tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID,
      id: { in: [...MATCH_SQUAD_CONTROLLED_PERSON_IDS] },
    },
    select: { id: true, displayName: true },
  });

  const playerSquadMembers = await prisma.playerSquadMember.findMany({
    where: {
      personId: { in: [...MATCH_SQUAD_CONTROLLED_PERSON_IDS] },
      teamSeason: { team: { tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID } },
    },
    select: { id: true, personId: true },
  });

  const participationResponses = await prisma.participationResponse.findMany({
    where: {
      tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID,
      personId: { in: [...MATCH_SQUAD_CONTROLLED_PERSON_IDS] },
      eventId: { in: [...MATCH_SQUAD_CONTROLLED_UAT_EVENT_IDS] },
    },
    select: { id: true, personId: true, eventId: true },
  });

  const playerReleases = await prisma.playerRelease.findMany({
    where: {
      tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID,
      personId: { in: [...MATCH_SQUAD_CONTROLLED_PERSON_IDS] },
    },
    select: { id: true, personId: true },
  });

  const releaseIds = playerReleases.map((row) => row.id);

  const playerReleaseRequests = await prisma.playerReleaseRequest.findMany({
    where: {
      tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID,
      OR: [
        { personId: { in: [...MATCH_SQUAD_CONTROLLED_PERSON_IDS] } },
        ...(releaseIds.length > 0 ? [{ playerReleaseId: { in: releaseIds } }] : []),
      ],
    },
    select: { id: true, personId: true },
  });

  const requestIds = playerReleaseRequests.map((row) => row.id);

  const matchSquadMembers = await prisma.matchSquadMember.findMany({
    where: {
      personId: { in: [...MATCH_SQUAD_CONTROLLED_PERSON_IDS] },
      matchSquad: { event: { tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID } },
    },
    select: { id: true, personId: true, playerReleaseRequestId: true },
  });

  const notificationEntityIds = [
    ...releaseIds,
    ...requestIds,
    ...matchSquadMembers.map((row) => row.id),
  ];

  const notifications =
    notificationEntityIds.length === 0
      ? []
      : await prisma.notification.findMany({
          where: {
            tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID,
            OR: [
              { entityId: { in: notificationEntityIds } },
              {
                type: {
                  in: ["PLAYER_RELEASE_TARGETED", "PLAYER_RELEASE_ASSIGNED"],
                },
              },
            ],
          },
          select: { id: true, type: true },
        });

  const notificationIds = notifications.map((row) => row.id);
  const notificationDeliveries =
    notificationIds.length === 0
      ? []
      : await prisma.notificationDelivery.findMany({
          where: { notificationId: { in: notificationIds } },
          select: { id: true, notificationId: true },
        });

  return {
    persons,
    playerSquadMembers,
    participationResponses,
    playerReleases,
    playerReleaseRequests,
    matchSquadMembers,
    notifications,
    notificationDeliveries,
  };
}

function printInventory(label: string, inventory: Inventory) {
  console.log(`\n=== ${label} ===`);
  for (const [key, rows] of Object.entries(inventory) as [keyof Inventory, unknown[]][]) {
    console.log(`${key}: ${rows.length}`);
    for (const row of rows as Array<{ id: string }>) {
      console.log(`  - ${row.id}`);
    }
  }
  const total = Object.values(inventory).reduce((sum, rows) => sum + rows.length, 0);
  console.log(`TOTAL_CONTROLLED_ROWS: ${total}`);
}

async function applyCleanup(inventory: Inventory): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const deliveryIds = inventory.notificationDeliveries.map((row) => row.id);
    if (deliveryIds.length > 0) {
      await tx.notificationDelivery.deleteMany({ where: { id: { in: deliveryIds } } });
    }

    const notificationIds = inventory.notifications.map((row) => row.id);
    if (notificationIds.length > 0) {
      await tx.notification.deleteMany({ where: { id: { in: notificationIds } } });
    }

    const msmIds = inventory.matchSquadMembers.map((row) => row.id);
    if (msmIds.length > 0) {
      await tx.matchSquadMember.deleteMany({ where: { id: { in: msmIds } } });
    }

    const requestIds = inventory.playerReleaseRequests.map((row) => row.id);
    if (requestIds.length > 0) {
      await tx.playerReleaseRequest.deleteMany({ where: { id: { in: requestIds } } });
    }

    const releaseIds = inventory.playerReleases.map((row) => row.id);
    if (releaseIds.length > 0) {
      await tx.playerRelease.deleteMany({ where: { id: { in: releaseIds } } });
    }

    const participationIds = inventory.participationResponses.map((row) => row.id);
    if (participationIds.length > 0) {
      await tx.participationResponse.deleteMany({ where: { id: { in: participationIds } } });
    }

    const squadIds = inventory.playerSquadMembers.map((row) => row.id);
    if (squadIds.length > 0) {
      await tx.playerSquadMember.deleteMany({ where: { id: { in: squadIds } } });
    }

    const personIds = inventory.persons.map((row) => row.id);
    if (personIds.length > 0) {
      await tx.person.deleteMany({ where: { id: { in: personIds } } });
    }
  });
}

async function main() {
  const apply = process.argv.includes("--apply");
  const confirmIdx = process.argv.indexOf("--confirm");
  const confirm =
    confirmIdx >= 0 ? String(process.argv[confirmIdx + 1] ?? "").trim() : "";

  const inventory = await loadInventory();
  printInventory(apply ? "APPLY_PLAN" : "DRY_RUN", inventory);

  if (!apply) {
    console.log("\nDRY_RUN complete — pass --apply --confirm MATCH-SQUAD-01F-CLEANUP to delete.");
    return;
  }

  if (confirm !== APPLY_CONFIRM) {
    console.error(`Refusing APPLY: expected --confirm ${APPLY_CONFIRM}`);
    process.exit(1);
  }

  assertOperationalMutationAllowed({
    operationId: "match-squad-01f-controlled-test-data-cleanup",
    databaseUrl: process.env.DATABASE_URL,
    explicitIntent: true,
    allowedRemoteEnvironments: ["stage"],
    operationSpecificAuthorization: process.env.SCE_OPERATION_AUTHORIZATION === "true",
  });

  if (process.env.APP_ENV !== "stage" && process.env.SCE_DATA_ENVIRONMENT !== "STAGE") {
    console.error("Refusing APPLY: APP_ENV=stage or SCE_DATA_ENVIRONMENT=STAGE required.");
    process.exit(1);
  }

  await applyCleanup(inventory);
  const after = await loadInventory();
  printInventory("POST_APPLY", after);

  const remaining = Object.values(after).reduce((sum, rows) => sum + rows.length, 0);
  if (remaining !== 0) {
    console.error(`Cleanup incomplete: ${remaining} controlled rows remain.`);
    process.exit(1);
  }
  console.log("\nAPPLY complete — TEST_DATA_REMAINING = 0 for ledger scope.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
