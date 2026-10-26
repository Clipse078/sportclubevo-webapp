import "server-only";

import { getRuntimeEnvironment } from "@/lib/env";
import {
  resolveSecurityLinkBaseUrl,
  SecurityLinkConfigurationError,
} from "@/lib/server/security-link-url";
import { assertSafeInternalNotificationHref } from "@/lib/notifications/internal-href";

function normalizeDeploymentHost(rawHost: string): string {
  return rawHost.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function resolveExplicitPublicActionBaseUrl(
  processEnv: NodeJS.ProcessEnv,
): URL | null {
  const configured = processEnv.PUBLIC_ACTION_BASE_URL?.trim();
  if (!configured) {
    return null;
  }

  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== "https:") {
      throw new SecurityLinkConfigurationError("INVALID_BASE_URL");
    }
    if (
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.search !== "" ||
      parsed.hash !== "" ||
      (parsed.pathname !== "/" && parsed.pathname !== "")
    ) {
      throw new SecurityLinkConfigurationError("INVALID_BASE_URL");
    }
    return new URL(parsed.origin);
  } catch (error) {
    if (error instanceof SecurityLinkConfigurationError) {
      throw error;
    }
    throw new SecurityLinkConfigurationError("INVALID_BASE_URL");
  }
}

function resolveVercelDeploymentOrigin(processEnv: NodeJS.ProcessEnv): URL | null {
  const deploymentHost = processEnv.VERCEL_URL?.trim();
  if (!deploymentHost) {
    return null;
  }

  const normalizedHost = normalizeDeploymentHost(deploymentHost);
  if (!normalizedHost) {
    return null;
  }

  return new URL(`https://${normalizedHost}`);
}

/**
 * Origin for externally actionable capability URLs (public publication share view/PDF).
 *
 * Security-sensitive bearer links (password reset, invites) keep using
 * {@link resolveSecurityLinkBaseUrl} via APP_BASE_URL.
 *
 * Preview deployments intentionally share the STAGE database while APP_BASE_URL
 * remains the tenant canonical host. Distribution emails must link back to the
 * deployment that created the DISTRIBUTION row (same code + Prisma client).
 */
export function resolvePublicActionBaseUrl(
  processEnv: NodeJS.ProcessEnv = process.env,
): URL {
  const explicit = resolveExplicitPublicActionBaseUrl(processEnv);
  if (explicit) {
    return explicit;
  }

  const runtime = getRuntimeEnvironment({
    ...processEnv,
    NODE_ENV: processEnv.NODE_ENV ?? "development",
  });
  const canonical = resolveSecurityLinkBaseUrl(processEnv);

  if (runtime.isPreview || runtime.isAcceptance) {
    const deploymentOrigin = resolveVercelDeploymentOrigin(processEnv);
    if (deploymentOrigin && deploymentOrigin.origin !== canonical.origin) {
      return deploymentOrigin;
    }
  }

  return canonical;
}

export function buildPublicActionAbsoluteHref(
  href: string,
  processEnv: NodeJS.ProcessEnv = process.env,
): string {
  assertSafeInternalNotificationHref(href);
  return new URL(href, resolvePublicActionBaseUrl(processEnv)).toString();
}

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

  const canonical = resolveSecurityLinkBaseUrl(processEnv);
  const deploymentOrigin = resolveVercelDeploymentOrigin(processEnv);
  return Boolean(deploymentOrigin && deploymentOrigin.origin !== canonical.origin);
}
