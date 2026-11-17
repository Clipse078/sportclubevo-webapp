/**
 * FCA STAGE — read-only VL meeting list visibility chain (Patrick + meetings; no mutations).
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   npx tsx scripts/fca-vl-meeting-visibility-readonly-diagnosis.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PILOT_TENANT_KEY } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { FCA_VL_CONFIRMED_ROSTER } from "@/lib/roles/fca-vl-reconciliation-registry";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { explainVisibilityDenial } from "@/lib/visibility/explain-visibility-denial";
import { canSeeEntity } from "@/lib/visibility/visibility-filter";
import { getMeetings, getMeetingBySlug } from "@/lib/meetings/queries";
import { loadOrgUnitIds } from "@/lib/org/queries";
import { resolveRuntimeIdentity } from "@/lib/server/runtime-identity";

const STAGE_FINGERPRINT = "acd3b37682911890";
const PATRICK_EMAIL = FCA_VL_CONFIRMED_ROSTER[0]?.email ?? "patrick.scotton@fcallschwil.ch";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.STAGE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[fca-vl-meeting-visibility-readonly-diagnosis] DATABASE_URL required.");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const identity = resolveRuntimeIdentity(process.env);
  const tenant = await prisma.tenant.findUnique({
    where: { key: PILOT_TENANT_KEY },
    select: { id: true, key: true },
  });
  if (!tenant) {
    console.log(JSON.stringify({ error: "tenant_not_found" }));
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: PATRICK_EMAIL, mode: "insensitive" } },
    select: { id: true, email: true, isActive: true },
  });
  if (!user) {
    console.log(JSON.stringify({ error: "patrick_user_not_found" }));
    return;
  }

  const sessionUser = { id: user.id, roleKeys: [] as string[], permissionKeys: [] as string[] };
  const actorOrdinary = await getActorContext(sessionUser, tenant.id);
  const impersonatedCarryOver = await getActorContext(
    {
      id: user.id,
      roleKeys: ["pilot_praesident"],
      permissionKeys: ["meetings.view", "meetings.manage"],
    },
    tenant.id,
  );

  const orgUnitIdsDirect = await loadOrgUnitIds(user.id, tenant.id);
  const meetingsDb = await prisma.meeting.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      visibilityScope: true,
      visibleRoleRefs: true,
      visibleOrgUnitRefs: true,
      visibleUserRefs: true,
      visiblePersonRefs: true,
      visibleTeamRefs: true,
      visibleTargetGroupRefs: true,
      createdByUserId: true,
    },
    orderBy: { meetingDate: "desc" },
  });

  const listOrdinary = await getMeetings(actorOrdinary);
  const listImpersonated = await getMeetings(impersonatedCarryOver);

  const perMeeting = await Promise.all(
    meetingsDb.map(async (meeting) => {
      const ordinaryExplain = explainVisibilityDenial(meeting, actorOrdinary);
      const impersonatedExplain = explainVisibilityDenial(meeting, impersonatedCarryOver);
      const detailOrdinary = await getMeetingBySlug(meeting.slug, actorOrdinary);
      const detailImpersonated = await getMeetingBySlug(meeting.slug, impersonatedCarryOver);
      return {
        slug: meeting.slug,
        title: meeting.title,
        status: meeting.status,
        visibilityScope: meeting.visibilityScope,
        allowlists: {
          visibleRoleRefs: meeting.visibleRoleRefs,
          visibleOrgUnitRefs: meeting.visibleOrgUnitRefs,
          visibleUserRefs: meeting.visibleUserRefs,
          visiblePersonRefs: meeting.visiblePersonRefs,
        },
        ordinary: {
          canSee: canSeeEntity(meeting, actorOrdinary),
          inList: listOrdinary.some((row) => row.slug === meeting.slug),
          detailRoute: detailOrdinary ? "ok" : "masked_404",
          exclusion: ordinaryExplain,
        },
        impersonatedJwtCarryOver: {
          canSee: canSeeEntity(meeting, impersonatedCarryOver),
          inList: listImpersonated.some((row) => row.slug === meeting.slug),
          detailRoute: detailImpersonated ? "ok" : "masked_404",
          exclusion: impersonatedExplain,
        },
      };
    }),
  );

  console.log(
    JSON.stringify(
      {
        fingerprint: identity.databaseFingerprint,
        expectedFingerprint: STAGE_FINGERPRINT,
        fingerprintMatch: identity.databaseFingerprint === STAGE_FINGERPRINT,
        dataEnvironment: identity.dataEnvironment,
        tenant: tenant.key,
        previewCommitHint: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        patrick: {
          userId: user.id,
          email: user.email,
        },
        actorOrdinary: {
          roleKeys: actorOrdinary.roleKeys,
          orgUnitIds: actorOrdinary.orgUnitIds,
          orgUnitIdsDirect,
          meetingPermissions: actorOrdinary.permissionKeys.filter((k) => k.startsWith("meetings.")),
        },
        actorImpersonatedCarryOver: {
          roleKeys: impersonatedCarryOver.roleKeys,
          orgUnitIds: impersonatedCarryOver.orgUnitIds,
        },
        meetings: perMeeting,
        listCounts: {
          ordinary: listOrdinary.length,
          impersonated: listImpersonated.length,
          tenantTotal: meetingsDb.length,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });