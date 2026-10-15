/**
 * SCE-NAVBAR-UPGRADE-01-R2 — read-only auth forensics (safe stdout only).
 * NEVER prints passwords, hashes, secrets, or full DATABASE_URL.
 */
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import {
  getDatabaseFingerprintFromUrl,
  resolveDeploymentIdentity,
} from "@/lib/server/deployment-identity";
import { resolveTenantMembershipContext } from "@/lib/auth/session-context";

const TARGET_EMAIL = "it@fcallschwil.ch";

function safeHost(databaseUrl: string | undefined): string | null {
  const raw = databaseUrl?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname || null;
  } catch {
    return null;
  }
}

async function main() {
  const identity = resolveDeploymentIdentity(process.env);
  const normalized = TARGET_EMAIL.trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: { email: normalized },
    select: {
      id: true,
      email: true,
      isActive: true,
      passwordHash: true,
    },
  });

  const user = users.length === 1 ? users[0] : undefined;
  const passwordHashPresent = Boolean(
    user?.passwordHash && user.passwordHash.length >= 10,
  );
  const bcryptFormat = Boolean(user?.passwordHash?.startsWith("$2"));

  let tenantMembershipExists = false;
  let fcaTenantRelationship = false;
  let activeMembershipWithActiveTenant = false;

  if (user) {
    const memberships = await prisma.tenantMembership.findMany({
      where: { userId: user.id },
      select: {
        isActive: true,
        tenant: { select: { key: true, name: true, status: true } },
      },
    });
    tenantMembershipExists = memberships.some((m) => m.isActive);
    fcaTenantRelationship = memberships.some(
      (m) =>
        /allschwil|fca/i.test(m.tenant.key) ||
        /allschwil|fc allschwil/i.test(m.tenant.name),
    );
    activeMembershipWithActiveTenant = memberships.some(
      (m) => m.isActive && m.tenant.status === "ACTIVE",
    );

    const tenantContext = await resolveTenantMembershipContext(prisma, user.id);
    if (tenantContext.activeTenantId) {
      // context resolves — login would proceed past password if password ok
    }
  }

  console.log(
    JSON.stringify(
      {
        environment: {
          appEnvironment: identity.appEnvironment,
          appEnvRaw: identity.appEnvRaw,
          vercelEnv: identity.vercelEnv,
          vercelTargetEnv: identity.vercelTargetEnv,
          databaseHost: identity.databaseHost,
          databaseFingerprint: identity.databaseFingerprint,
          localFingerprint: getDatabaseFingerprintFromUrl(process.env.DATABASE_URL),
          databaseHostFromEnv: safeHost(process.env.DATABASE_URL),
          authConfigured: identity.authConfigured,
          identityValid: identity.identityValid,
        },
        account: {
          EMAIL: normalized,
          USER_EXISTS: users.length === 1,
          USER_COUNT: users.length,
          CREDENTIAL_RECORD_EXISTS: users.length === 1,
          PASSWORD_HASH_PRESENT: passwordHashPresent,
          BCRYPT_FORMAT: bcryptFormat,
          ACCOUNT_ACTIVE: user?.isActive ?? false,
          TENANT_MEMBERSHIP_EXISTS: tenantMembershipExists,
          FCA_TENANT_RELATIONSHIP: fcaTenantRelationship,
          ACTIVE_MEMBERSHIP_ACTIVE_TENANT: activeMembershipWithActiveTenant,
        },
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    }),
  );
  process.exit(1);
});
