/**
 * Safe runtime diagnostic endpoint.
 *
 * Returns a structured identity report for authorized SCE administrators.
 * Used for deployment triage: compare two builds' commit, environment, and
 * database identity without resetting credentials or performing database
 * archaeology.
 *
 * Access requires the users.manage permission. The endpoint is permanently
 * available and always returns 200 so tooling that discards non-200 responses
 * can still read the JSON body.
 *
 * Sections:
 *   - CONFIGURED: required configuration is present
 *   - CONNECTED: database is reachable
 *   - IDENTITY_VALIDATED: full identity check passes
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
  const access = await requireApiPermission(PERMISSIONS.USERS_MANAGE);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const runtime = evaluateRuntimeConfiguration();
  const identity = resolveDeploymentIdentity();

  const database = runtime.env.hasDatabaseUrl
    ? await checkDatabaseHealth()
    : { ok: false, message: "DATABASE_URL is not configured." };

  const configured =
    identity.authConfigured.hasNextAuthSecret &&
    identity.authConfigured.hasDatabaseUrl;

  const connected = configured && database.ok;
  const identityValidated =
    connected && identity.identityValid === "PASS" && runtime.ok;

  return NextResponse.json({
    healthOk: identityValidated,

    // ── Deployment provenance ──────────────────────────────────────────────
    deployment: {
      commitSha: identity.commitSha,
      commitRef: identity.commitRef,
      deploymentId: identity.deploymentId,
      deploymentUrl: identity.deploymentUrl,
      vercelEnvironment: identity.vercelEnv,
      vercelTargetEnv: identity.vercelTargetEnv,
      appEnvironment: identity.appEnvironment,
      isDeployed: identity.isDeployed,
    },

    // ── Identity validation ───────────────────────────────────────────────
    identity: {
      identityValid: identity.identityValid,
      identityViolations: identity.identityViolations,
    },

    // ── Three-phase status ────────────────────────────────────────────────
    phases: {
      CONFIGURED: configured,
      CONNECTED: connected,
      IDENTITY_VALIDATED: identityValidated,
    },

    // ── Configuration presence (no values) ───────────────────────────────
    checks: {
      hasDatabaseUrl: identity.authConfigured.hasDatabaseUrl,
      hasNextAuthSecret: identity.authConfigured.hasNextAuthSecret,
      hasAppBaseUrl: identity.authConfigured.hasAppBaseUrl,
      hasNextAuthUrl: identity.authConfigured.hasNextAuthUrl,
    },

    // ── Database identity ─────────────────────────────────────────────────
    database: {
      host: identity.databaseHost,
      fingerprint: identity.databaseFingerprint,
      connectivity: database,
    },

    // ── Runtime classification ────────────────────────────────────────────
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

    // ── Configuration warnings/errors ─────────────────────────────────────
    warnings: runtime.warnings,
    errors: runtime.errors,

    timestamp: new Date().toISOString(),
  });
}
