/**
 * Shared dashboard hero image helpers — SCE-DASHBOARD-V3-03
 *
 * Storage namespace: dashboard-hero/{userId}.{ext}
 * Distinct from person-photos (avatar) and media library assets.
 */

import {
  BlobServiceRateLimited,
  del,
  put,
} from "@vercel/blob";
import { logAction } from "@/lib/audit/log-action";
import { isVercelBlobUrl } from "@/lib/media/upload";
import {
  ALLOWED_IMAGE_MIMES,
  MIME_TO_EXT,
  validateImageFile,
} from "@/lib/people/profile-image-shared";
import { getDashboardHeroStorageKey } from "@/lib/dashboard/dashboard-hero-image";

type DashboardHeroBlobEnvironment = {
  BLOB_READ_WRITE_TOKEN?: string;
  BLOB_STORE_ID?: string;
  VERCEL?: string;
  VERCEL_OIDC_TOKEN?: string;
};

function readNonEmpty(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function hasDashboardHeroOidcConfiguration(
  env: DashboardHeroBlobEnvironment = process.env,
): boolean {
  const hasStore = Boolean(readNonEmpty(env.BLOB_STORE_ID));
  const hasRuntimeOidc =
    Boolean(readNonEmpty(env.VERCEL)) || Boolean(readNonEmpty(env.VERCEL_OIDC_TOKEN));

  return hasStore && hasRuntimeOidc;
}

export function isDashboardHeroStorageAvailable(
  env: DashboardHeroBlobEnvironment = process.env,
): boolean {
  return (
    hasDashboardHeroOidcConfiguration(env) ||
    Boolean(readNonEmpty(env.BLOB_READ_WRITE_TOKEN))
  );
}

function getDashboardHeroBlobAuthOptions(token: string | undefined): { token?: string } {
  if (hasDashboardHeroOidcConfiguration()) {
    return {};
  }

  const staticToken = readNonEmpty(token);
  return staticToken ? { token: staticToken } : {};
}

function redactBlobCredentials(message: string, token: string | undefined): string {
  const sensitiveValues = [
    token,
    process.env.BLOB_READ_WRITE_TOKEN,
    process.env.VERCEL_OIDC_TOKEN,
    process.env.BLOB_STORE_ID,
  ]
    .map(readNonEmpty)
    .filter((value): value is string => Boolean(value));

  return sensitiveValues.reduce(
    (redacted, value) => redacted.replaceAll(value, "[REDACTED]"),
    message,
  );
}

function getSafeBlobErrorDetails(error: unknown, token?: string): {
  errorClass: string;
  errorMessage: string;
  errorStatus?: number;
} {
  if (error instanceof BlobServiceRateLimited) {
    return {
      errorClass: error.constructor.name,
      errorMessage: redactBlobCredentials(error.message, token),
      errorStatus: error.retryAfter,
    };
  }

  if (error instanceof Error) {
    return {
      errorClass: error.constructor.name,
      errorMessage: redactBlobCredentials(error.message, token),
    };
  }

  return {
    errorClass: typeof error,
    errorMessage: redactBlobCredentials(String(error), token),
  };
}

export type UploadDashboardHeroResult =
  | { ok: true; imageUrl: string; persisted: boolean }
  | { ok: false; status: 400 | 500 | 503; error: string };

export type RemoveDashboardHeroResult =
  | { ok: true; persisted: boolean }
  | { ok: false; status: 404 | 500; error: string };

export async function uploadUserDashboardHeroImage({
  userId,
  currentImageUrl,
  file,
  token,
}: {
  userId: string;
  currentImageUrl: string | null | undefined;
  file: Blob;
  token?: string;
}): Promise<UploadDashboardHeroResult> {
  const validated = await validateImageFile(file);
  if (!validated.ok) {
    return { ok: false, status: validated.status, error: validated.error };
  }

  const storageKey = getDashboardHeroStorageKey(userId, validated.ext);
  const authOptions = getDashboardHeroBlobAuthOptions(token);

  try {
    if (currentImageUrl && isVercelBlobUrl(currentImageUrl)) {
      try {
        await del(currentImageUrl, authOptions);
      } catch {
        // Non-fatal cleanup
      }
    }

    const blob = await put(storageKey, validated.buffer, {
      access: "public",
      contentType: validated.mime,
      addRandomSuffix: false,
      allowOverwrite: true,
      ...authOptions,
    });

    await logAction({
      actorUserId: userId,
      moduleKey: "account",
      entityType: "User",
      entityId: userId,
      action: "dashboard_hero_image_uploaded",
      afterJson: { imageUrl: blob.url },
    });

    return { ok: true, imageUrl: blob.url, persisted: false };
  } catch (error) {
    const details = getSafeBlobErrorDetails(error, token);
    console.error("[dashboard-hero-image-shared] upload failed", {
      storageKey,
      errorClass: details.errorClass,
      errorMessage: details.errorMessage,
      ...(details.errorStatus !== undefined ? { errorStatus: details.errorStatus } : {}),
    });
    return { ok: false, status: 500, error: "Titelbild konnte nicht hochgeladen werden." };
  }
}

export async function removeUserDashboardHeroImage({
  userId,
  currentImageUrl,
  token,
}: {
  userId: string;
  currentImageUrl: string | null | undefined;
  token: string | undefined;
}): Promise<RemoveDashboardHeroResult> {
  if (!currentImageUrl) {
    return { ok: false, status: 404, error: "Kein Titelbild vorhanden." };
  }

  const authOptions = getDashboardHeroBlobAuthOptions(token);

  try {
    if (
      (authOptions.token || isDashboardHeroStorageAvailable()) &&
      isVercelBlobUrl(currentImageUrl)
    ) {
      try {
        await del(currentImageUrl, authOptions);
      } catch {
        // Non-fatal
      }
    }

    await logAction({
      actorUserId: userId,
      moduleKey: "account",
      entityType: "User",
      entityId: userId,
      action: "dashboard_hero_image_removed",
      beforeJson: { imageUrl: currentImageUrl },
    });

    return { ok: true, persisted: false };
  } catch (error) {
    const details = getSafeBlobErrorDetails(error, token);
    console.error("[dashboard-hero-image-shared] remove failed", {
      errorClass: details.errorClass,
      errorMessage: details.errorMessage,
      ...(details.errorStatus !== undefined ? { errorStatus: details.errorStatus } : {}),
    });
    return { ok: false, status: 500, error: "Titelbild konnte nicht entfernt werden." };
  }
}

export { ALLOWED_IMAGE_MIMES, MIME_TO_EXT };
