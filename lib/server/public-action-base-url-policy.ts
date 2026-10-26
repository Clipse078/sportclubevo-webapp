import { getRuntimeEnvironment } from "@/lib/env";

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

function isLikelyVercelPreviewHostname(hostname: string): boolean {
  return hostname.toLowerCase().includes(".vercel.app");
}

/**
 * Detects Preview/Acceptance configs where distribution public links would target
 * canonical STAGE/tenant host instead of the executing deployment.
 */
export function publicActionBaseWouldCrossIncompatibleDeployment(
  processEnv: NodeJS.ProcessEnv = process.env,
): boolean {
  const runtime = getRuntimeEnvironment({
    ...processEnv,
    NODE_ENV: processEnv.NODE_ENV ?? "development",
  });
  if (!runtime.isPreview && !runtime.isAcceptance) {
    return false;
  }

  const canonicalOrigin =
    readOriginFromConfiguredBaseUrl(processEnv.APP_BASE_URL) ??
    readOriginFromConfiguredBaseUrl(processEnv.NEXTAUTH_URL);
  if (!canonicalOrigin) {
    return false;
  }

  const deploymentOrigin = deploymentOriginFromEnv(processEnv);
  if (deploymentOrigin) {
    return deploymentOrigin !== canonicalOrigin;
  }

  try {
    const hostname = new URL(canonicalOrigin).hostname;
    return !isLikelyVercelPreviewHostname(hostname);
  } catch {
    return true;
  }
}
