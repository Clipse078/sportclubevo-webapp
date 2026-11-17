import type { NextRequest } from "next/server";
import { SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC } from "@/lib/branding/sportclubevo-platform-wordmark";
import { isVercelSsoProtectedDeploymentHost } from "@/lib/email/resolve-transactional-sce-email-logo-url";

/**
 * Logo `src` for invitation HTML rendered inside the authenticated admin shell.
 *
 * Outbound email uses `resolveTransactionalSceEmailLogoAbsoluteUrl()` (canonical
 * tenant origin). That URL sets Cross-Origin-Resource-Policy: same-origin, so
 * embedding it from a Vercel preview deployment breaks the &lt;img&gt; in the
 * in-page preview. HTML previews now use {@link resolveAdminInvitationEmailPreviewLogoSrc}
 * (bundled data URI). This resolver remains for callers that need a fetchable URL.
 */
export function resolveAdminInvitationEmailPreviewLogoUrl(
  request: Pick<NextRequest, "nextUrl" | "headers">,
): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim() || request.nextUrl.host;

  if (!host || isVercelSsoProtectedDeploymentHost(host)) {
    return SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC;
  }

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(/:$/, "") ||
    "https";

  if (proto !== "https" && proto !== "http") {
    return SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC;
  }

  return new URL(SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC, `${proto}://${host}`).toString();
}