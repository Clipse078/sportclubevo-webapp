import "server-only";

import { getRuntimeEnvironment } from "@/lib/env";
import {
  publicActionBaseWouldCrossIncompatibleDeployment,
  resolvePublicActionBaseUrl,
} from "@/lib/server/public-action-base-url";
import { FinanceDomainError } from "@/lib/finance/errors";

/**
 * Operator attestation that the configured public-action origin is reachable by
 * unauthenticated external recipients (no Vercel Deployment Protection wall).
 *
 * Required for Preview/Acceptance when recipient links would otherwise target
 * a protected `*.vercel.app` deployment hostname.
 */
export const PUBLIC_ACTION_EXTERNALLY_REACHABLE_ATTESTATION =
  "PUBLIC_ACTION_EXTERNALLY_REACHABLE" as const;

export type PublicActionTargetFailureCode =
  | "MISSING_DEPLOYMENT_HOST"
  | "CROSS_INCOMPATIBLE_RUNTIME"
  | "DEPLOYMENT_PROTECTION"
  | "MISCONFIGURED_PUBLIC_ACTION_BASE_URL";

export type PublicActionTargetEvaluation = {
  origin: string;
  runtimeCompatible: boolean;
  externallyReachable: boolean;
  capabilitySecured: boolean;
  valid: boolean;
  failureCode: PublicActionTargetFailureCode | null;
};

function readOriginFromConfiguredBaseUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function normalizeDeploymentHost(rawHost: string): string {
  return rawHost.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function deploymentOriginFromEnv(processEnv: NodeJS.ProcessEnv): string | null {
  const deploymentHost = processEnv.VERCEL_URL?.trim();
  if (!deploymentHost) {
    return null;
  }
  const normalizedHost = normalizeDeploymentHost(deploymentHost);
  if (!normalizedHost) {
    return null;
  }
  return `https://${normalizedHost}`;
}

export function isVercelAppHostname(hostname: string): boolean {
  return hostname.toLowerCase().endsWith(".vercel.app");
}

export function readPublicActionExternallyReachableAttestation(
  processEnv: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = processEnv[PUBLIC_ACTION_EXTERNALLY_REACHABLE_ATTESTATION]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "confirmed";
}

function evaluateRuntimeCompatible(
  processEnv: NodeJS.ProcessEnv,
  resolvedOrigin: string,
): boolean {
  const runtime = getRuntimeEnvironment({
    ...processEnv,
    NODE_ENV: processEnv.NODE_ENV ?? "development",
  });
  const canonicalOrigin =
    readOriginFromConfiguredBaseUrl(processEnv.APP_BASE_URL) ??
    readOriginFromConfiguredBaseUrl(processEnv.NEXTAUTH_URL);
  const deploymentOrigin = deploymentOriginFromEnv(processEnv);
  const explicitPublicActionOrigin = readOriginFromConfiguredBaseUrl(
    processEnv.PUBLIC_ACTION_BASE_URL,
  );

  if (!runtime.isDeployed) {
    return true;
  }

  const vercelEnv = processEnv.VERCEL_ENV?.trim().toLowerCase() ?? null;
  if (vercelEnv === "production" && canonicalOrigin) {
    return resolvedOrigin === canonicalOrigin;
  }

  if (publicActionBaseWouldCrossIncompatibleDeployment(processEnv)) {
    if (canonicalOrigin && resolvedOrigin === canonicalOrigin) {
      return false;
    }
    if (explicitPublicActionOrigin) {
      if (deploymentOrigin && explicitPublicActionOrigin === deploymentOrigin) {
        return true;
      }
      if (
        deploymentOrigin &&
        explicitPublicActionOrigin !== deploymentOrigin &&
        explicitPublicActionOrigin !== canonicalOrigin
      ) {
        return readPublicActionExternallyReachableAttestation(processEnv);
      }
      return explicitPublicActionOrigin !== canonicalOrigin;
    }
    if (deploymentOrigin) {
      return resolvedOrigin === deploymentOrigin;
    }
    return false;
  }

  if (canonicalOrigin) {
    return resolvedOrigin === canonicalOrigin;
  }

  return true;
}

function evaluateExternallyReachable(
  processEnv: NodeJS.ProcessEnv,
  resolvedOrigin: string,
): boolean {
  const runtime = getRuntimeEnvironment({
    ...processEnv,
    NODE_ENV: processEnv.NODE_ENV ?? "development",
  });

  if (!runtime.isDeployed || runtime.isLocal || runtime.isTest) {
    return true;
  }

  const vercelEnv = processEnv.VERCEL_ENV?.trim().toLowerCase() ?? null;
  let hostname: string;
  try {
    hostname = new URL(resolvedOrigin).hostname;
  } catch {
    return false;
  }

  if (vercelEnv === "production" && !isVercelAppHostname(hostname)) {
    return true;
  }

  if (readPublicActionExternallyReachableAttestation(processEnv)) {
    return true;
  }

  if (runtime.isPreview || runtime.isAcceptance) {
    if (isVercelAppHostname(hostname)) {
      return false;
    }
    const explicit = processEnv.PUBLIC_ACTION_BASE_URL?.trim();
    return Boolean(explicit);
  }

  return !isVercelAppHostname(hostname);
}

function resolveFailureCode(input: {
  runtimeCompatible: boolean;
  externallyReachable: boolean;
  processEnv: NodeJS.ProcessEnv;
}): PublicActionTargetFailureCode | null {
  if (input.runtimeCompatible && input.externallyReachable) {
    return null;
  }

  const cross = publicActionBaseWouldCrossIncompatibleDeployment(input.processEnv);
  const deploymentOrigin = deploymentOriginFromEnv(input.processEnv);
  const explicit = input.processEnv.PUBLIC_ACTION_BASE_URL?.trim();

  if (cross && !deploymentOrigin) {
    return "MISSING_DEPLOYMENT_HOST";
  }

  if (!input.runtimeCompatible) {
    if (explicit && cross) {
      return "MISCONFIGURED_PUBLIC_ACTION_BASE_URL";
    }
    return "CROSS_INCOMPATIBLE_RUNTIME";
  }

  if (!input.externallyReachable) {
    return "DEPLOYMENT_PROTECTION";
  }

  return "MISCONFIGURED_PUBLIC_ACTION_BASE_URL";
}

export function evaluatePublicActionTarget(
  processEnv: NodeJS.ProcessEnv = process.env,
): PublicActionTargetEvaluation {
  const origin = resolvePublicActionBaseUrl(processEnv).origin;
  const runtimeCompatible = evaluateRuntimeCompatible(processEnv, origin);
  const externallyReachable = evaluateExternallyReachable(processEnv, origin);
  const capabilitySecured = true;
  const valid = runtimeCompatible && externallyReachable && capabilitySecured;
  const failureCode = valid
    ? null
    : resolveFailureCode({ runtimeCompatible, externallyReachable, processEnv });

  return {
    origin,
    runtimeCompatible,
    externallyReachable,
    capabilitySecured,
    valid,
    failureCode,
  };
}

const DISTRIBUTION_PUBLIC_ACTION_UNAVAILABLE_DE =
  "Empfängerlinks sind in dieser Vorschau-Umgebung noch nicht öffentlich erreichbar (Vercel Deployment Protection). " +
  "Bitte die in docs/deployment/stage-preview-migration-runbook.md beschriebene FIN-06E Preview-Konfiguration anwenden " +
  "oder FIN-06E auf STAGE bereitstellen, bevor externe Testempfänger versendet werden.";

export function requirePublicActionTargetForFinanceDistribution(
  processEnv: NodeJS.ProcessEnv = process.env,
): void {
  const evaluation = evaluatePublicActionTarget(processEnv);
  if (evaluation.valid) {
    return;
  }

  throw new FinanceDomainError(
    "FINANCE_PUBLICATION_DISTRIBUTION_UNAVAILABLE",
    DISTRIBUTION_PUBLIC_ACTION_UNAVAILABLE_DE,
    503,
  );
}
