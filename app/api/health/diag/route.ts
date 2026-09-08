/**
 * Runtime identity diagnostic.
 *
 * A public, non-secret subset remains available when authentication is
 * unavailable. Database connectivity details and runtime warnings/errors are
 * added only for callers with users.manage.
 */
import { NextResponse } from "next/server";
import {
  checkDatabaseHealth,
  evaluateRuntimeConfiguration,
} from "@/lib/server/runtime";
import { resolveDeploymentIdentity } from "@/lib/server/deployment-identity";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const identity = resolveDeploymentIdentity();
  const publicDiagnostic = {
    access: "public" as const,
    deployment: {
      commitSha: identity.commitSha,
      commitRef: identity.commitRef,
      vercelEnvironment: identity.vercelEnv,
      vercelTargetEnv: identity.vercelTargetEnv,
      appEnvironment: identity.appEnvironment,
    },
    identity: {
      identityValid: identity.identityValid,
      identityViolations: identity.identityViolations,
    },
    checks: identity.authConfigured,
    database: {
      host: identity.databaseHost,
      fingerprint: identity.databaseFingerprint,
    },
    timestamp: new Date().toISOString(),
  };

  let access;
  try {
    access = await requireApiPermission(PERMISSIONS.USERS_MANAGE);
  } catch {
    return NextResponse.json(publicDiagnostic);
  }

  if (!access.ok) {
    return NextResponse.json(publicDiagnostic);
  }

  const runtime = evaluateRuntimeConfiguration();
  const database = runtime.env.hasDatabaseUrl
    ? await checkDatabaseHealth()
    : { ok: false, message: "DATABASE_URL is not configured." };
  const configured =
    identity.authConfigured.hasNextAuthSecret &&
    identity.authConfigured.hasDatabaseUrl;
  const connected = configured && database.ok;
  const healthOk =
    connected && identity.identityValid === "PASS" && runtime.ok;

  return NextResponse.json({
    ...publicDiagnostic,
    access: "authorized",
    healthOk,
    deployment: {
      ...publicDiagnostic.deployment,
      deploymentId: identity.deploymentId,
      deploymentUrl: identity.deploymentUrl,
      isDeployed: identity.isDeployed,
    },
    phases: {
      CONFIGURED: configured,
      CONNECTED: connected,
      IDENTITY_VALIDATED: healthOk,
    },
    environment: {
      appEnv: runtime.env.appEnv,
      nodeEnv: runtime.env.nodeEnv,
      vercelEnv: runtime.env.vercelEnv,
      isDeployed: runtime.env.isDeployed,
      isLocal: runtime.env.isLocal,
      isPreview: runtime.env.isPreview,
      isAcceptance: runtime.env.isAcceptance,
      isStage: runtime.env.isStage,
      isProd: runtime.env.isProd,
    },
    database: {
      ...publicDiagnostic.database,
      connectivity: database,
    },
    warnings: runtime.warnings,
    errors: runtime.errors,
  });
}
