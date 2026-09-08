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

function getSafeBlobErrorDetails(error: unknown): {
  errorClass: string;
  errorMessage: string;
  errorStatus?: number;
} {
  if (error instanceof BlobServiceRateLimited) {
    return {
      errorClass: error.constructor.name,
      errorMessage: error.message,
      errorStatus: error.retryAfter,
    };
  }

  if (error instanceof Error) {
    return {
      errorClass: error.constructor.name,
      errorMessage: error.message,
    };
  }

  return {
    errorClass: typeof error,
    errorMessage: String(error),
  };
}

function normalizeBlobToken(token: string): string {
  return token.trim();
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
  token: string;
}): Promise<UploadDashboardHeroResult> {
  const validated = await validateImageFile(file);
  if (!validated.ok) {
    return { ok: false, status: validated.status, error: validated.error };
  }

  const storageKey = getDashboardHeroStorageKey(userId, validated.ext);
  const blobToken = normalizeBlobToken(token);

  try {
    if (currentImageUrl && isVercelBlobUrl(currentImageUrl)) {
      try {
        await del(currentImageUrl, { token: blobToken });
      } catch {
        // Non-fatal cleanup
      }
    }

    const blob = await put(storageKey, validated.buffer, {
      access: "public",
      contentType: validated.mime,
      token: blobToken,
      addRandomSuffix: false,
      allowOverwrite: true,
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
    const details = getSafeBlobErrorDetails(error);
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

  const blobToken = token ? normalizeBlobToken(token) : undefined;

  try {
    if (blobToken && isVercelBlobUrl(currentImageUrl)) {
      try {
        await del(currentImageUrl, { token: blobToken });
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
    const details = getSafeBlobErrorDetails(error);
    console.error("[dashboard-hero-image-shared] remove failed", {
      errorClass: details.errorClass,
      errorMessage: details.errorMessage,
      ...(details.errorStatus !== undefined ? { errorStatus: details.errorStatus } : {}),
    });
    return { ok: false, status: 500, error: "Titelbild konnte nicht entfernt werden." };
  }
}

export { ALLOWED_IMAGE_MIMES, MIME_TO_EXT };
