/**
 * Auth.js Credentials provider — canonical authorize() implementation.
 *
 * Used by auth.ts and covered by regression tests. Navbar and other UI layers
 * must never duplicate this logic.
 */

import type { PrismaClient } from "@prisma/client";
import { verifyPassword } from "@/lib/auth/password";
import { runLoginTimingMitigation } from "@/lib/auth/login-timing";
import {
  logLoginFailure,
  type LoginFailureCategory,
} from "@/lib/security/security-events";
import {
  resolveSessionPermissionKeys,
  resolveTenantMembershipContext,
} from "@/lib/auth/session-context";
import type { SessionUserShape } from "@/lib/auth/trusted-session-state";

export type CredentialsInput = {
  email?: string | null;
  password?: string | null;
};

export type AuthorizeCredentialsResult =
  | { ok: true; user: SessionUserShape }
  | { ok: false; category: LoginFailureCategory };

function normalizeLoginEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function authorizeCredentialsUser(
  prisma: PrismaClient,
  credentials: CredentialsInput,
): Promise<AuthorizeCredentialsResult> {
  const email = normalizeLoginEmail(String(credentials.email ?? ""));
  const password = String(credentials.password ?? "");

  if (!email || !password) {
    return { ok: false, category: "MISSING_CREDENTIALS" };
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email },
    });
  } catch (lookupErr) {
    console.error(
      "[auth] authorize: user lookup failed",
      lookupErr instanceof Error ? lookupErr.message : String(lookupErr),
    );
    return { ok: false, category: "USER_LOOKUP_FAILED" };
  }

  if (!user) {
    await runLoginTimingMitigation(password);
    logLoginFailure("USER_NOT_FOUND");
    return { ok: false, category: "USER_NOT_FOUND" };
  }

  if (!user.isActive) {
    await runLoginTimingMitigation(password);
    logLoginFailure("ACCOUNT_DISABLED");
    return { ok: false, category: "ACCOUNT_DISABLED" };
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    logLoginFailure("CREDENTIAL_VERIFICATION_FAILED");
    return { ok: false, category: "CREDENTIAL_VERIFICATION_FAILED" };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  } catch (updateErr) {
    console.error(
      "[auth] authorize: lastLoginAt update failed (non-fatal)",
      updateErr instanceof Error ? updateErr.message : String(updateErr),
    );
  }

  let tenantContext: Awaited<ReturnType<typeof resolveTenantMembershipContext>>;
  let permissionKeys: string[];
  let roleKeys: string[];

  try {
    tenantContext = await resolveTenantMembershipContext(prisma, user.id);
    permissionKeys = await resolveSessionPermissionKeys(
      prisma,
      user.id,
      tenantContext.activeTenantId,
    );

    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      select: { role: { select: { key: true } } },
    });
    roleKeys = Array.from(new Set(userRoles.map((ur) => ur.role.key)));
  } catch (sessionErr) {
    console.error(
      "[auth] authorize: session-context build failed — tenant/permission/role query threw",
      sessionErr instanceof Error ? sessionErr.message : String(sessionErr),
    );
    logLoginFailure("SESSION_CONTEXT_FAILED");
    return { ok: false, category: "SESSION_CONTEXT_FAILED" };
  }

  const authUser: SessionUserShape = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleKeys,
    permissionKeys,
    isImpersonating: false,
    effectiveUserId: user.id,
    activeTenantId: tenantContext.activeTenantId,
    activeMembershipId: tenantContext.activeMembershipId,
    availableTenants: tenantContext.availableTenants,
  };

  return { ok: true, user: authUser };
}

export { normalizeLoginEmail };
