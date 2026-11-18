/**
 * FCA STAGE — read-only VL meeting visibility parity (dashboard ↔ list ↔ detail; no mutations).
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
import { resolvePersonalContext } from "@/lib/dashboard/personal-context";
import { loadMeetingProgrammeItems } from "@/lib/personal-agenda/adapters/meeting-programme-adapter";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { loadTenantProgrammeBranding } from "@/lib/personal-agenda/tenant-programme-branding";

const STAGE_FINGERPRINT = "acd3b37682911890";

/** PO-reported VL members on STAGE (2026-11-18). */
const PO_VL_EMAILS = [
  "irem.uysal@fcallschwil.ch",
  "nicole.nussli@fcallschwil.ch",
  "andreas.gaedt@fcallschwil.ch",
  "rene.leupi@fcallschwil.ch",
  "patrick.scotton@fcallschwil.ch",
] as const;

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.STAGE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[fca-vl-meeting-visibility-readonly-diagnosis] DATABASE_URL required.");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function diagnoseUser(
  tenantId: string,
  email: string,
  meetingsDb: Awaited<ReturnType<typeof loadMeetings>>,
) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, isActive: true },
  });
  if (!user) {
    return { email, error: "user_not_found" as const };
  }

  const [membership, linkedPerson, roles] = await Promise.all([
    prisma.tenantMembership.findFirst({
      where: { tenantId, userId: user.id },
      select: { isActive: true },
    }),
    prisma.person.findFirst({
      where: { tenantId, userId: user.id },
      select: { id: true, isActive: true },
    }),
    prisma.userRole.findMany({
      where: { userId: user.id, tenantId },
      select: {
        role: {
          select: {
            key: true,
            name: true,
            canAccessVereinsleitung: true,
            canAttendVereinsleitungMeetings: true,
          },
        },
      },
    }),
  ]);
  const assignments = linkedPerson
    ? await prisma.personAssignment.findMany({
        where: { tenantId, personId: linkedPerson.id },
        select: { status: true, functionKey: true, orgUnit: { select: { key: true, name: true } } },
      })
    : [];

  const sessionUser = { id: user.id, roleKeys: [] as string[], permissionKeys: [] as string[] };
  const actor = await getActorContext(sessionUser, tenantId);
  const personal = await resolvePersonalContext({ tenantId, userId: user.id });
  const perms = await getRequestEffectivePermissions(user.id, tenantId);
  const permissionKeys = [...perms.platform, ...perms.tenant];
  const orgUnitIdsDirect = await loadOrgUnitIds(user.id, tenantId);
  const branding = await loadTenantProgrammeBranding(tenantId);
  const programme =
    personal.hasActiveTenantMembership && permissionKeys.length > 0
      ? await loadMeetingProgrammeItems({
          personal,
          permissionKeys,
          timeZone: "Europe/Zurich",
          rangeStart: new Date("2026-10-01"),
          rangeEnd: new Date("2026-12-31"),
          tenantBranding: branding,
        })
      : [];

  const list = await getMeetings(actor);

  const perMeeting = await Promise.all(
    meetingsDb.map(async (meeting) => {
      const detail = await getMeetingBySlug(meeting.slug, actor);
      return {
        slug: meeting.slug,
        title: meeting.title,
        visibilityScope: meeting.visibilityScope,
        allowlists: {
          visibleRoleRefs: meeting.visibleRoleRefs,
          visibleOrgUnitRefs: meeting.visibleOrgUnitRefs,
          visibleUserRefs: meeting.visibleUserRefs,
          visiblePersonRefs: meeting.visiblePersonRefs,
        },
        dashboard: programme.some((item) => item.deepLink?.includes(meeting.slug)),
        list: list.some((row) => row.slug === meeting.slug),
        detail: detail ? "ok" : "masked_404",
        intendedEligible:
          actor.permissionKeys.some((k) => k === "meetings.view" || k === "meetings.manage") &&
          canSeeEntity(meeting, actor),
        exclusion: explainVisibilityDenial(meeting, actor),
      };
    }),
  );

  return {
    email: user.email,
    userId: user.id,
    personId: linkedPerson?.id ?? null,
    personIsActive: linkedPerson?.isActive ?? null,
    membershipActive: membership?.isActive ?? false,
    hasActiveTenantMembership: personal.hasActiveTenantMembership,
    roles: roles.map((r) => r.role),
    personAssignments: assignments,
    orgUnitsPersonal: personal.orgUnits.map((o) => ({
      orgUnitId: o.orgUnitId,
      sources: o.sources,
    })),
    actor: {
      roleKeys: actor.roleKeys,
      orgUnitIds: actor.orgUnitIds,
      orgUnitIdsDirect,
      meetingPermissions: actor.permissionKeys.filter((k) => k.startsWith("meetings.")),
    },
    listCount: list.length,
    programmeMeetingCount: programme.length,
    meetings: perMeeting,
  };
}

async function loadMeetings(tenantId: string) {
  return prisma.meeting.findMany({
    where: { tenantId },
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
}

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

  const meetingsDb = await loadMeetings(tenant.id);
  const rosterEmails = [
    ...new Set([...FCA_VL_CONFIRMED_ROSTER.map((t) => t.email), ...PO_VL_EMAILS]),
  ];

  const subjects = [];
  for (const email of rosterEmails) {
    subjects.push(await diagnoseUser(tenant.id, email, meetingsDb));
  }

  console.log(
    JSON.stringify(
      {
        fingerprint: identity.databaseFingerprint,
        expectedFingerprint: STAGE_FINGERPRINT,
        fingerprintMatch: identity.databaseFingerprint === STAGE_FINGERPRINT,
        dataEnvironment: identity.dataEnvironment,
        tenant: tenant.key,
        previewCommitHint: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        subjects,
        tenantMeetingTotal: meetingsDb.length,
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