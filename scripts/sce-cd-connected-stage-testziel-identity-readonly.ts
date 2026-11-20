/**
 * PR #1017 — read-only STAGE evidence for Testziel I «Verantwortlich» root cause.
 * Does not mutate data. Requires designated STAGE fingerprint via APP_ENV + SCE_DATA_ENVIRONMENT.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";

export const STAGE_PO_UAT_TESTZIEL_I_ID = "cmwpanrjn000008l6jhpjhjb4" as const;
const STAGE_PO_UAT_TESTZIEL_I_TITLE = "Testziel I" as const;

function assertStageReadOnly(): void {
  const runtime = getRuntimeEnvironment(process.env);
  if (runtime.appEnv !== "stage") {
    throw new Error(`APP_ENV must be stage (got ${runtime.appEnv}).`);
  }
  if (getRuntimeDataEnvironment() !== "STAGE") {
    throw new Error("SCE_DATA_ENVIRONMENT must be STAGE.");
  }
  const fp = getDatabaseFingerprintFromEffectivePrismaSource(process.env);
  if (fp !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(`Designated STAGE fingerprint required (got ${fp ?? "null"}).`);
  }
}

async function main(): Promise<void> {
  assertStageReadOnly();
  const connectionString =
    process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL missing.");

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const target = await prisma.target.findFirst({
      where: { id: STAGE_PO_UAT_TESTZIEL_I_ID, title: STAGE_PO_UAT_TESTZIEL_I_TITLE },
      select: {
        id: true,
        title: true,
        createdByUserId: true,
        visiblePersonRefs: true,
        visibleUserRefs: true,
      },
    });
    if (!target) {
      throw new Error(`Target ${STAGE_PO_UAT_TESTZIEL_I_TITLE} not found on STAGE.`);
    }

    const creator = target.createdByUserId
      ? await prisma.user.findUnique({
          where: { id: target.createdByUserId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            person: { select: { id: true, firstName: true, lastName: true, displayName: true } },
          },
        })
      : null;

    const focus = await prisma.clubStrategyFocusTarget.findMany({
      where: { targetId: target.id },
      select: {
        clubStrategy: { select: { id: true, responsibleLabel: true, responsiblePersonId: true } },
      },
    });

    const legacyMislabelSource = creator
      ? [creator.firstName, creator.lastName].filter(Boolean).join(" ").trim()
      : null;
    const canonicalCreatorPerson = creator?.person
      ? creator.person.displayName?.trim() ||
        `${creator.person.firstName} ${creator.person.lastName}`.trim()
      : null;

    console.log(
      JSON.stringify(
        {
          pullRequest: 1017,
          writePerformed: false,
          targetId: target.id,
          targetTitle: target.title,
          rootCause: {
            fieldPreviouslyShownAsVerantwortlich: "Target.createdByUserId → User.firstName/lastName (creator account columns)",
            renderedMislabel: legacyMislabelSource,
            strategyResponsibleLabelOnLinkedStrategies: focus.map((row) => row.clubStrategy.responsibleLabel),
            assigneeFieldsOnTarget: {
              visiblePersonRefs: target.visiblePersonRefs,
              visibleUserRefs: target.visibleUserRefs,
            },
            expectedVerantwortlichAfterFix: "Nicht zugewiesen",
            erstelltVonPersonDisplay: canonicalCreatorPerson,
          },
          note: "Verantwortlich must not reuse strategy owner or creator User columns; Erstellt von uses Person-linked display.",
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});