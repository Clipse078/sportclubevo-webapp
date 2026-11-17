/**
 * FCA STAGE — read-only VL bulk invitation row matrix (no sends, no tokens).
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   npx tsx scripts/fca-vl-invitations-prepare-readonly.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PILOT_TENANT_KEY } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import {
  FCA_VL_INVITATION_CONFIRMED_EMAILS,
  FCA_VL_INVITATION_EXCLUDED_FROM_BULK_PREPARE,
} from "@/lib/admin/vl-onboarding/fca-vl-confirmed-invitee-emails";
import { resolveVlInvitationRows } from "@/lib/admin/vl-onboarding/resolve-vl-invitation-rows";
import { FCA_VL_INVITATION_PRESET } from "@/lib/admin/vl-onboarding/fca-vl-invitation-preset";
import { resolveRuntimeIdentity } from "@/lib/server/runtime-identity";

const STAGE_FINGERPRINT = "acd3b37682911890";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.STAGE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[fca-vl-invitations-prepare-readonly] DATABASE_URL required.");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function lookupInvitationState(tenantId: string, email: string) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, isActive: true },
  });
  const person = await prisma.person.findFirst({
    where: { tenantId, email: { equals: email, mode: "insensitive" } },
    select: { id: true, firstName: true, lastName: true, userId: true },
  });
  const membership = user
    ? await prisma.tenantMembership.findFirst({
        where: { tenantId, userId: user.id },
        select: { isActive: true, createdAt: true },
      })
    : null;
  const pendingToken = user
    ? await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          isInvitation: true,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true, expiresAt: true },
      })
    : null;

  return {
    account: user
      ? { userId: user.id, email: user.email, isActive: user.isActive }
      : null,
    person: person
      ? {
          personId: person.id,
          userId: person.userId,
          firstName: person.firstName,
          lastName: person.lastName,
        }
      : null,
    membership: membership
      ? { isActive: membership.isActive, createdAt: membership.createdAt.toISOString() }
      : null,
    pendingInvitation: pendingToken
      ? { tokenId: pendingToken.id, expiresAt: pendingToken.expiresAt.toISOString() }
      : null,
  };
}

async function main() {
  const identity = resolveRuntimeIdentity(process.env);
  const tenant = await prisma.tenant.findUnique({
    where: { key: PILOT_TENANT_KEY },
    select: { id: true, key: true, name: true },
  });
  if (!tenant) {
    console.log(JSON.stringify({ error: "tenant_not_found" }, null, 2));
    return;
  }

  const excluded = new Set(
    FCA_VL_INVITATION_EXCLUDED_FROM_BULK_PREPARE.map((e) => e.toLowerCase()),
  );
  const emails = FCA_VL_INVITATION_CONFIRMED_EMAILS.filter(
    (e) => !excluded.has(e.toLowerCase()),
  );

  const resolved = await resolveVlInvitationRows(tenant.id, emails);

  const enriched = [];
  for (const row of resolved) {
    enriched.push({
      ...row,
      datastore: await lookupInvitationState(tenant.id, row.email),
    });
  }

  const contributorRole = await prisma.role.findFirst({
    where: {
      tenantId: tenant.id,
      isArchived: false,
      OR: [
        { key: FCA_VL_INVITATION_PRESET.roleMatch.key },
        { name: FCA_VL_INVITATION_PRESET.roleMatch.name },
      ],
    },
    select: {
      id: true,
      key: true,
      name: true,
      canAccessVereinsleitung: true,
      canAttendVereinsleitungMeetings: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        fingerprint: identity.databaseFingerprint,
        expectedFingerprint: STAGE_FINGERPRINT,
        fingerprintMatch: identity.databaseFingerprint === STAGE_FINGERPRINT,
        dataEnvironment: identity.dataEnvironment,
        tenant,
        presetRoleOnTenant: contributorRole,
        contributorRoleMissing: contributorRole === null,
        recipients: enriched,
        missingIdentityFields: enriched.map((r) => ({
          email: r.email,
          requiredDisplayName: !r.displayName,
          optionalOrgFunction: Boolean(r.missingFunction),
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error("[fca-vl-invitations-prepare-readonly] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });