import { isVercelBlobUrl } from "@/lib/assets/storage";
import { resolveTransactionalSceEmailLogoAbsoluteUrl } from "@/lib/email/resolve-transactional-sce-email-logo-url";
import { buildNotificationAbsoluteHref } from "@/lib/notifications/internal-href";

/**
 * Email clients require absolute HTTPS (or trusted blob) image URLs.
 * Relative tenant branding paths are resolved against the canonical app host.
 */
export function resolveFinanceTransactionalEmailAssetUrl(
  url: string | null | undefined,
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) {
    return buildNotificationAbsoluteHref(trimmed);
  }

  if (isVercelBlobUrl(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveFinancePublicationDistributionSceEmailLogoUrl(): string {
  return resolveTransactionalSceEmailLogoAbsoluteUrl();
}
