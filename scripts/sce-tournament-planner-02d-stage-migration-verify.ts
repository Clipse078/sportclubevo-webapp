#!/usr/bin/env npx tsx
/**
 * SCE-TOURNAMENT-PLANNER-02D — STAGE migration inventory / optional apply.
 */

import { prisma } from "@/lib/db/prisma";

const APPLY = process.argv.includes("--apply");

async function main(): Promise<void> {
  const migrationName = "20261019160000_sce_tournament_planner_02d_programme_templates";
  const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE migration_name = ${migrationName}
  `;

  const sideColumn = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'TournamentFixtureSide'
      AND column_name = 'participantUnitId'
  `;

  const configColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'TournamentCompetitionConfiguration'
      AND column_name IN ('programmeTemplateId', 'programmeTemplateVersion', 'programmeTemplateSlotMappingJson')
  `;

  console.log(
    JSON.stringify(
      {
        migrationName,
        migrationApplied: applied.length > 0,
        participantUnitIdColumn: sideColumn.length > 0,
        programmeTemplateConfigColumns: configColumns.length,
        applyRequested: APPLY,
      },
      null,
      2,
    ),
  );

  if (APPLY) {
    console.error("Use prisma migrate deploy for STAGE apply — script is inventory-only.");
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
