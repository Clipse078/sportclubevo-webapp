import { isVercelBlobUrl } from "@/lib/assets/storage";
import { buildNotificationAbsoluteHref } from "@/lib/notifications/internal-href";

const SCE_EMAIL_FOOTER_LOGO_PATH = "/images/branding/sportclubevo_logo.png";

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
  return buildNotificationAbsoluteHref(SCE_EMAIL_FOOTER_LOGO_PATH);
}
