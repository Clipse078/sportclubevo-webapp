/**
 * Shared dashboard hero image helpers — SCE-DASHBOARD-V3-03
 *
 * Storage namespace: dashboard-hero/{userId}.{ext}
 * Distinct from person-photos (avatar) and media library assets.
 */

import { put, del } from "@vercel/blob";
import { logAction } from "@/lib/audit/log-action";
import { isVercelBlobUrl } from "@/lib/media/upload";
import {
  ALLOWED_IMAGE_MIMES,
  MIME_TO_EXT,
  validateImageFile,
} from "@/lib/people/profile-image-shared";
import { getDashboardHeroStorageKey } from "@/lib/dashboard/dashboard-hero-image";

function getSafeErrorCategory(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "UnknownError";
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

  try {
    if (currentImageUrl && isVercelBlobUrl(currentImageUrl)) {
      try {
        await del(currentImageUrl, { token });
      } catch {
        // Non-fatal cleanup
      }
    }

    const blob = await put(storageKey, validated.buffer, {
      access: "public",
      contentType: validated.mime,
      token,
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
    console.error("[dashboard-hero-image-shared] upload failed", {
      errorCategory: getSafeErrorCategory(error),
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

  try {
    if (token && isVercelBlobUrl(currentImageUrl)) {
      try {
        await del(currentImageUrl, { token });
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
    console.error("[dashboard-hero-image-shared] remove failed", {
      errorCategory: getSafeErrorCategory(error),
    });
    return { ok: false, status: 500, error: "Titelbild konnte nicht entfernt werden." };
  }
}

export { ALLOWED_IMAGE_MIMES, MIME_TO_EXT };
