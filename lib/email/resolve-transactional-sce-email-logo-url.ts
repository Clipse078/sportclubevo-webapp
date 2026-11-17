import "server-only";

import {
  SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_ASPECT,
  SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC,
} from "@/lib/branding/sportclubevo-platform-wordmark";
import {
  resolveSecurityLinkBaseUrl,
} from "@/lib/server/security-link-url";

/**
 * Canonical STAGE origin for static transactional email assets when the
 * deployment host is SSO-protected (Vercel preview) or security-link config
 * is absent in tests.
 */
export const TRANSACTIONAL_EMAIL_ASSET_CANONICAL_FALLBACK_ORIGIN =
  "https://fcallschwil.sportclubevo.com";

/** Display size for `sportclubevo_logo.png` in light-surface transactional HTML. */
export const TRANSACTIONAL_SCE_EMAIL_LOGO_DISPLAY_WIDTH_PX = 147;
export const TRANSACTIONAL_SCE_EMAIL_LOGO_DISPLAY_HEIGHT_PX = Math.round(
  TRANSACTIONAL_SCE_EMAIL_LOGO_DISPLAY_WIDTH_PX /
    SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_ASPECT,
);

function isVercelSsoProtectedDeploymentHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  return normalized === "vercel.app" || normalized.endsWith(".vercel.app");
}

function resolveConfiguredAppBaseOrigin(processEnv: NodeJS.ProcessEnv): string | null {
  const configured = processEnv.APP_BASE_URL?.trim();
  if (!configured) {
    return null;
  }
  try {
    const parsed = new URL(configured);
    if (
      parsed.protocol !== "https:" ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.search !== "" ||
      parsed.hash !== "" ||
      (parsed.pathname !== "/" && parsed.pathname !== "") ||
      isVercelSsoProtectedDeploymentHost(parsed.hostname)
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Absolute HTTPS URL for the official SCE wordmark in transactional email HTML.
 * Never uses Vercel preview deployment hosts (SSO) — only canonical tenant/app origins.
 */
export function resolveTransactionalSceEmailLogoAbsoluteUrl(
  processEnv: NodeJS.ProcessEnv = process.env,
): string {
  const configuredAppOrigin = resolveConfiguredAppBaseOrigin(processEnv);
  if (configuredAppOrigin) {
    return new URL(
      SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC,
      configuredAppOrigin,
    ).toString();
  }

  try {
    const securityOrigin = resolveSecurityLinkBaseUrl(processEnv);
    if (!isVercelSsoProtectedDeploymentHost(securityOrigin.hostname)) {
      return new URL(
        SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC,
        securityOrigin,
      ).toString();
    }
  } catch {
    // fall through to STAGE canonical host
  }

  return new URL(
    SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC,
    TRANSACTIONAL_EMAIL_ASSET_CANONICAL_FALLBACK_ORIGIN,
  ).toString();
}