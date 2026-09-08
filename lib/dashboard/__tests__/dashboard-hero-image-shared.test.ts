/**
 * @vitest-environment node
 *
 * SCE-DASHBOARD-V3-03 — dashboard hero blob upload shared helpers
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const originalBlobEnvironment = {
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  BLOB_STORE_ID: process.env.BLOB_STORE_ID,
  VERCEL: process.env.VERCEL,
  VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL;
  delete process.env.VERCEL_OIDC_TOKEN;
  mocks.put.mockResolvedValue({
    url: "https://abc.public.blob.vercel-storage.com/dashboard-hero/user-abc.jpg",
  });
  mocks.del.mockResolvedValue(undefined);
  mocks.fileTypeFromBuffer.mockResolvedValue({ mime: "image/jpeg" });
  mocks.logAction.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(mocks.consoleError);
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const [key, value] of Object.entries(originalBlobEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
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

  it("uses connected-store OIDC without explicitly passing a stale static token", async () => {
    process.env.VERCEL = "1";
    process.env.BLOB_STORE_ID = "store_dashboard";
    process.env.VERCEL_OIDC_TOKEN = "oidc-runtime-credential";
    process.env.BLOB_READ_WRITE_TOKEN = "stale-static-token";

    const file = new File([Buffer.from("jpeg")], "hero.jpg", { type: "image/jpeg" });

    await uploadUserDashboardHeroImage({
      userId: USER_ID,
      currentImageUrl:
        "https://abc.public.blob.vercel-storage.com/dashboard-hero/user-abc.png",
      file,
      token: "stale-static-token",
    });

    expect(mocks.del).toHaveBeenCalledWith(
      "https://abc.public.blob.vercel-storage.com/dashboard-hero/user-abc.png",
      {},
    );
    expect(mocks.put).toHaveBeenCalledWith(
      "dashboard-hero/user-abc.jpg",
      expect.any(Buffer),
      expect.not.objectContaining({ token: expect.anything() }),
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

  it("redacts Blob credential values from error logs", async () => {
    process.env.VERCEL = "1";
    process.env.BLOB_STORE_ID = "store_dashboard_secret";
    process.env.VERCEL_OIDC_TOKEN = "oidc-secret";
    process.env.BLOB_READ_WRITE_TOKEN = "static-secret";
    mocks.put.mockRejectedValueOnce(
      new Error(
        "Failure oidc-secret static-secret store_dashboard_secret",
      ),
    );

    const file = new File([Buffer.from("jpeg")], "hero.jpg", { type: "image/jpeg" });

    await uploadUserDashboardHeroImage({
      userId: USER_ID,
      currentImageUrl: null,
      file,
      token: "static-secret",
    });

    const logged = JSON.stringify(mocks.consoleError.mock.calls);
    expect(logged).not.toContain("oidc-secret");
    expect(logged).not.toContain("static-secret");
    expect(logged).not.toContain("store_dashboard_secret");
    expect(logged).toContain("[REDACTED]");
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

  it("uses connected-store OIDC for delete without explicitly passing a stale token", async () => {
    process.env.VERCEL = "1";
    process.env.BLOB_STORE_ID = "store_dashboard";
    process.env.BLOB_READ_WRITE_TOKEN = "stale-static-token";

    await removeUserDashboardHeroImage({
      userId: USER_ID,
      currentImageUrl:
        "https://abc.public.blob.vercel-storage.com/dashboard-hero/user-abc.jpg",
      token: "stale-static-token",
    });

    expect(mocks.del).toHaveBeenCalledWith(
      "https://abc.public.blob.vercel-storage.com/dashboard-hero/user-abc.jpg",
      {},
    );
  });
});
