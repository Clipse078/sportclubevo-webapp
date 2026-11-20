import {
  ClubStrategyScopeType,
  DevelopmentSprintStatus,
  TargetCategory,
  TargetPeriod,
  TargetStatus,
  ReviewWorkflowStage,
  type PrismaClient,
} from "@prisma/client";
import {
  ACCEPTANCE_DATABASE_NAME,
  assertAcceptanceDatabaseTarget,
} from "@/lib/acceptance/bootstrap";
import {
  SCE_CD_CONNECTED_ACCEPTANCE_SEED_AUTHORIZATION,
  SCE_CD_CONNECTED_ACCEPTANCE_SEED_CONFIRM,
  SCE_CD_CONNECTED_PO_UAT_ACTOR_USER_ID,
  SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID,
  SCE_CD_CONNECTED_PO_UAT_ORG_UNIT_ID,
  SCE_CD_CONNECTED_PO_UAT_ORG_UNIT_KEY,
  SCE_CD_CONNECTED_PO_UAT_SPRINT_ID,
  SCE_CD_CONNECTED_PO_UAT_SPRINT_SLUG,
  SCE_CD_CONNECTED_PO_UAT_SPRINT_TITLE,
  SCE_CD_CONNECTED_PO_UAT_TARGET_ID,
  SCE_CD_CONNECTED_PO_UAT_TARGET_TITLE,
  SCE_CD_CONNECTED_PO_UAT_TENANT_ID,
} from "@/lib/acceptance/sce-cd-connected-workspace-po-uat-ledger";

export type ConnectedWorkspacePoUatSeedReport = {
  tenantId: string;
  orgUnitId: string;
  clubStrategyId: string;
  targetId: string;
  sprintId: string;
  sprintSlug: string;
};

export function assertConnectedWorkspaceAcceptanceSeedEnvironment(
  env: NodeJS.ProcessEnv,
): { databaseUrl: string } {
  if (env.SCE_OPERATION_AUTHORIZATION !== SCE_CD_CONNECTED_ACCEPTANCE_SEED_AUTHORIZATION) {
    throw new Error("Missing or invalid SCE_OPERATION_AUTHORIZATION for connected workspace acceptance seed.");
  }
  if (
    env.APP_ENV?.trim().toLowerCase() !== "acceptance" ||
    env.VERCEL_TARGET_ENV?.trim().toLowerCase() !== "acceptance" ||
    env.NODE_ENV !== "production"
  ) {
    throw new Error(
      "Connected workspace acceptance seed requires APP_ENV=acceptance, VERCEL_TARGET_ENV=acceptance, NODE_ENV=production.",
    );
  }
  if (env.SCE_CD_CONNECTED_SEED_CONFIRM !== SCE_CD_CONNECTED_ACCEPTANCE_SEED_CONFIRM) {
    throw new Error("SCE_CD_CONNECTED_SEED_CONFIRM is missing or invalid.");
  }
  const databaseUrl = env.DATABASE_URL?.trim();
  const expectedHost = env.ACCEPTANCE_DATABASE_HOST?.trim().toLowerCase();
  if (!databaseUrl || !expectedHost) {
    throw new Error("DATABASE_URL and ACCEPTANCE_DATABASE_HOST are required.");
  }
  assertAcceptanceDatabaseTarget(databaseUrl, [expectedHost]);
  return { databaseUrl };
}

async function assertConnectedWorkspaceSchema(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ClubStrategy'
      AND column_name IN ('scopeType', 'scopeOrgUnitId', 'title')
  `;
  const columns = new Set(rows.map((r) => r.column_name));
  if (!columns.has("scopeType")) {
    throw new Error(
      "Connected workspace schema missing on this database. Apply migration 20261120120000_sce_cd_connected_workspace before seeding.",
    );
  }
}

export async function seedConnectedWorkspacePoUatFixtures(
  prisma: PrismaClient,
): Promise<ConnectedWorkspacePoUatSeedReport> {
  const dbName = await prisma.$queryRawUnsafe<Array<{ database_name: string }>>(
    "SELECT current_database() AS database_name",
  );
  if (dbName[0]?.database_name !== ACCEPTANCE_DATABASE_NAME) {
    throw new Error("Refusing seed: connected database is not sce_acceptance.");
  }

  await assertConnectedWorkspaceSchema(prisma);

  const clubRoot = await prisma.orgUnit.findFirst({
    where: { tenantId: SCE_CD_CONNECTED_PO_UAT_TENANT_ID, key: "club" },
    select: { id: true },
  });
  if (!clubRoot) {
    throw new Error("Canonical Acceptance bootstrap missing club OrgUnit; run db:bootstrap-acceptance:safe first.");
  }

  await prisma.orgUnit.upsert({
    where: {
      tenantId_key: {
        tenantId: SCE_CD_CONNECTED_PO_UAT_TENANT_ID,
        key: SCE_CD_CONNECTED_PO_UAT_ORG_UNIT_KEY,
      },
    },
    create: {
      id: SCE_CD_CONNECTED_PO_UAT_ORG_UNIT_ID,
      tenantId: SCE_CD_CONNECTED_PO_UAT_TENANT_ID,
      parentId: clubRoot.id,
      key: SCE_CD_CONNECTED_PO_UAT_ORG_UNIT_KEY,
      name: "SCE Acceptance Junioren (PO UAT)",
      type: "DEPARTMENT",
      status: "ACTIVE",
      level: 1,
      sortOrder: 10,
    },
    update: {
      parentId: clubRoot.id,
      name: "SCE Acceptance Junioren (PO UAT)",
      type: "DEPARTMENT",
      status: "ACTIVE",
    },
  });

  await prisma.clubStrategy.upsert({
    where: { id: SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID },
    create: {
      id: SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID,
      tenantId: SCE_CD_CONNECTED_PO_UAT_TENANT_ID,
      scopeType: ClubStrategyScopeType.CLUB,
      scopeOrgUnitId: null,
      title: "PO UAT #1017 — Vereinsweite Strategie",
      situationText: "Synthetic Ausgangslage für connected-workspace PO UAT.",
      alignmentText: "Synthetic Ausrichtung — Aufgabe aus Ziel, Sprint-Planung, Rollup.",
      periodLabel: "PO UAT 2026",
      createdByUserId: SCE_CD_CONNECTED_PO_UAT_ACTOR_USER_ID,
      updatedByUserId: SCE_CD_CONNECTED_PO_UAT_ACTOR_USER_ID,
    },
    update: {
      situationText: "Synthetic Ausgangslage für connected-workspace PO UAT.",
      alignmentText: "Synthetic Ausrichtung — Aufgabe aus Ziel, Sprint-Planung, Rollup.",
      title: "PO UAT #1017 — Vereinsweite Strategie",
      updatedByUserId: SCE_CD_CONNECTED_PO_UAT_ACTOR_USER_ID,
    },
  });

  await prisma.target.upsert({
    where: { id: SCE_CD_CONNECTED_PO_UAT_TARGET_ID },
    create: {
      id: SCE_CD_CONNECTED_PO_UAT_TARGET_ID,
      tenantId: SCE_CD_CONNECTED_PO_UAT_TENANT_ID,
      title: SCE_CD_CONNECTED_PO_UAT_TARGET_TITLE,
      description: "Linked Schwerpunkt-Ziel für PR #1017 PO acceptance.",
      category: TargetCategory.GOVERNANCE,
      status: TargetStatus.ACTIVE,
      period: TargetPeriod.YEAR,
      periodLabel: "PO UAT",
      reviewStage: ReviewWorkflowStage.PUBLISHED,
      visibilityScope: "ORGANISATION",
      createdByUserId: SCE_CD_CONNECTED_PO_UAT_ACTOR_USER_ID,
      visibleOrgUnitRefs: [{ id: SCE_CD_CONNECTED_PO_UAT_ORG_UNIT_ID, title: "Junioren" }],
    },
    update: {
      title: SCE_CD_CONNECTED_PO_UAT_TARGET_TITLE,
      status: TargetStatus.ACTIVE,
      reviewStage: ReviewWorkflowStage.PUBLISHED,
    },
  });

  await prisma.clubStrategyFocusTarget.upsert({
    where: {
      clubStrategyId_targetId: {
        clubStrategyId: SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID,
        targetId: SCE_CD_CONNECTED_PO_UAT_TARGET_ID,
      },
    },
    create: {
      tenantId: SCE_CD_CONNECTED_PO_UAT_TENANT_ID,
      clubStrategyId: SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID,
      targetId: SCE_CD_CONNECTED_PO_UAT_TARGET_ID,
      sortOrder: 0,
    },
    update: { sortOrder: 0 },
  });

  const sprintStarts = new Date();
  sprintStarts.setUTCDate(sprintStarts.getUTCDate() + 1);
  const sprintEnds = new Date(sprintStarts);
  sprintEnds.setUTCDate(sprintEnds.getUTCDate() + 14);

  await prisma.developmentSprint.upsert({
    where: { id: SCE_CD_CONNECTED_PO_UAT_SPRINT_ID },
    create: {
      id: SCE_CD_CONNECTED_PO_UAT_SPRINT_ID,
      tenantId: SCE_CD_CONNECTED_PO_UAT_TENANT_ID,
      slug: SCE_CD_CONNECTED_PO_UAT_SPRINT_SLUG,
      title: SCE_CD_CONNECTED_PO_UAT_SPRINT_TITLE,
      goal: "PO plant eine aus dem Ziel erstellte Aufgabe in diese Umsetzungsphase.",
      status: DevelopmentSprintStatus.PLANNED,
      startsAt: sprintStarts,
      endsAt: sprintEnds,
      visibilityScope: "ORGANISATION",
      createdByUserId: SCE_CD_CONNECTED_PO_UAT_ACTOR_USER_ID,
    },
    update: {
      title: SCE_CD_CONNECTED_PO_UAT_SPRINT_TITLE,
      status: DevelopmentSprintStatus.PLANNED,
      startsAt: sprintStarts,
      endsAt: sprintEnds,
    },
  });

  return {
    tenantId: SCE_CD_CONNECTED_PO_UAT_TENANT_ID,
    orgUnitId: SCE_CD_CONNECTED_PO_UAT_ORG_UNIT_ID,
    clubStrategyId: SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID,
    targetId: SCE_CD_CONNECTED_PO_UAT_TARGET_ID,
    sprintId: SCE_CD_CONNECTED_PO_UAT_SPRINT_ID,
    sprintSlug: SCE_CD_CONNECTED_PO_UAT_SPRINT_SLUG,
  };
}