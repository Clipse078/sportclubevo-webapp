/**
 * @vitest-environment node
 *
 * SCE-DASHBOARD-V3-03 — dashboard hero blob upload shared helpers
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  put: vi.fn(),
  del: vi.fn(),
  fileTypeFromBuffer: vi.fn(),
  logAction: vi.fn(),
  consoleError: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  BlobServiceRateLimited: class BlobServiceRateLimited extends Error {
    retryAfter = 42;
  },
  put: mocks.put,
  del: mocks.del,
}));

vi.mock("file-type", () => ({
  fileTypeFromBuffer: mocks.fileTypeFromBuffer,
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

vi.mock("@/lib/media/upload", () => ({
  isVercelBlobUrl: (url: string | null | undefined) =>
    Boolean(url?.includes("blob.vercel-storage.com")),
}));

import {
  removeUserDashboardHeroImage,
  uploadUserDashboardHeroImage,
} from "@/lib/dashboard/dashboard-hero-image-shared";

const USER_ID = "user-abc";
const TOKEN = "test-token";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.put.mockResolvedValue({
    url: "https://abc.public.blob.vercel-storage.com/dashboard-hero/user-abc.jpg",
  });
  mocks.del.mockResolvedValue(undefined);
  mocks.fileTypeFromBuffer.mockResolvedValue({ mime: "image/jpeg" });
  mocks.logAction.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(mocks.consoleError);
});

describe("uploadUserDashboardHeroImage", () => {
  it("uploads to the user-scoped dashboard hero namespace with stable overwrite options", async () => {
    const file = new File([Buffer.from("jpeg")], "hero.jpg", { type: "image/jpeg" });

    const result = await uploadUserDashboardHeroImage({
      userId: USER_ID,
      currentImageUrl: null,
      file,
      token: ` ${TOKEN} `,
    });

    expect(result).toEqual({
      ok: true,
      imageUrl: "https://abc.public.blob.vercel-storage.com/dashboard-hero/user-abc.jpg",
      persisted: false,
    });
    expect(mocks.put).toHaveBeenCalledWith(
      "dashboard-hero/user-abc.jpg",
      expect.any(Buffer),
      {
        access: "public",
        contentType: "image/jpeg",
        token: TOKEN,
        addRandomSuffix: false,
        allowOverwrite: true,
      },
    );
  });

  it("logs actionable blob error details when put fails", async () => {
    class BlobAccessError extends Error {}
    mocks.put.mockRejectedValueOnce(
      Object.assign(new BlobAccessError("Vercel Blob: Access denied"), {
        name: "Error",
      }),
    );

    const file = new File([Buffer.from("jpeg")], "hero.jpg", { type: "image/jpeg" });

    const result = await uploadUserDashboardHeroImage({
      userId: USER_ID,
      currentImageUrl: null,
      file,
      token: TOKEN,
    });

    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Titelbild konnte nicht hochgeladen werden.",
    });
    expect(mocks.consoleError).toHaveBeenCalledWith(
      "[dashboard-hero-image-shared] upload failed",
      expect.objectContaining({
        storageKey: "dashboard-hero/user-abc.jpg",
        errorClass: "BlobAccessError",
        errorMessage: "Vercel Blob: Access denied",
      }),
    );
  });

  it("logs retry status for rate-limited blob failures", async () => {
    const { BlobServiceRateLimited } = await import("@vercel/blob");
    mocks.put.mockRejectedValueOnce(new BlobServiceRateLimited("Too many requests"));

    const file = new File([Buffer.from("jpeg")], "hero.jpg", { type: "image/jpeg" });

    await uploadUserDashboardHeroImage({
      userId: USER_ID,
      currentImageUrl: null,
      file,
      token: TOKEN,
    });

    expect(mocks.consoleError).toHaveBeenCalledWith(
      "[dashboard-hero-image-shared] upload failed",
      expect.objectContaining({
        errorClass: "BlobServiceRateLimited",
        errorStatus: 42,
      }),
    );
  });
});

describe("removeUserDashboardHeroImage", () => {
  it("trims the blob token before delete", async () => {
    const result = await removeUserDashboardHeroImage({
      userId: USER_ID,
      currentImageUrl: "https://abc.public.blob.vercel-storage.com/dashboard-hero/user-abc.jpg",
      token: ` ${TOKEN} `,
    });

    expect(result).toEqual({ ok: true, persisted: false });
    expect(mocks.del).toHaveBeenCalledWith(
      "https://abc.public.blob.vercel-storage.com/dashboard-hero/user-abc.jpg",
      { token: TOKEN },
    );
  });
});
