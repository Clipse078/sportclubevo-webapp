import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC } from "@/lib/branding/sportclubevo-platform-wordmark";

let cachedBundledLogoDataUri: string | null = null;

function resolveBundledSceWordmarkPreviewLogoDataUri(): string {
  if (cachedBundledLogoDataUri) {
    return cachedBundledLogoDataUri;
  }
  const relative = SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC.replace(/^\//, "");
  const filePath = path.join(process.cwd(), "public", relative);
  const base64 = readFileSync(filePath).toString("base64");
  cachedBundledLogoDataUri = `data:image/png;base64,${base64}`;
  return cachedBundledLogoDataUri;
}

/**
 * Logo `src` for administrator invitation HTML previews (bulk panel and
 * sandboxed `srcDoc` iframes). Uses the trusted bundled PNG so embedding is not
 * blocked by CORP/CSP or opaque-origin iframe rules. Outbound mail keeps
 * {@link resolveTransactionalSceEmailLogoAbsoluteUrl}.
 */
export function resolveAdminInvitationEmailPreviewLogoSrc(
  _request?: Pick<NextRequest, "nextUrl" | "headers">,
): string {
  return resolveBundledSceWordmarkPreviewLogoDataUri();
}