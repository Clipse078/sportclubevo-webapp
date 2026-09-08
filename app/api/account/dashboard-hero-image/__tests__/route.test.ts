/**
 * SCE-DASHBOARD-V3-03C — /api/account/dashboard-hero-image route tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SESSION_USER = {
  id: "user-001",
  email: "alice@example.com",
  firstName: "Alice",
  lastName: "Test",
  activeTenantId: "tenant-001",
  permissionKeys: [],
  roleKeys: [],
  isImpersonating: false,
  activeMembershipId: "mem-001",
  availableTenants: [],
};

const DEFAULT_STATE = {
  imageUrl: null,
  zoom: 1,
  positionX: 0.5,
  positionY: 0.5,
};

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUserDashboardHeroState: vi.fn(),
  updateUserDashboardHeroImage: vi.fn(),
  updateUserDashboardHeroTransform: vi.fn(),
  clearUserDashboardHero: vi.fn(),
  uploadUserDashboardHeroImage: vi.fn(),
  removeUserDashboardHeroImage: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/dashboard/dashboard-hero-image", () => ({
  getUserDashboardHeroState: mocks.getUserDashboardHeroState,
  updateUserDashboardHeroImage: mocks.updateUserDashboardHeroImage,
  updateUserDashboardHeroTransform: mocks.updateUserDashboardHeroTransform,
  clearUserDashboardHero: mocks.clearUserDashboardHero,
}));

vi.mock("@/lib/dashboard/dashboard-hero-image-shared", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/dashboard/dashboard-hero-image-shared")
  >()),
  uploadUserDashboardHeroImage: mocks.uploadUserDashboardHeroImage,
  removeUserDashboardHeroImage: mocks.removeUserDashboardHeroImage,
}));

import { NextRequest } from "next/server";
import { DELETE, GET, PATCH, POST } from "@/app/api/account/dashboard-hero-image/route";

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
  mocks.auth.mockResolvedValue({ user: SESSION_USER });
  mocks.getUserDashboardHeroState.mockResolvedValue(DEFAULT_STATE);
  mocks.updateUserDashboardHeroImage.mockResolvedValue({
    ok: true,
    persisted: true,
    state: {
      imageUrl: "https://cdn.example/hero.jpg",
      zoom: 1,
      positionX: 0.5,
      positionY: 0.5,
    },
  });
  mocks.updateUserDashboardHeroTransform.mockResolvedValue({
    ok: true,
    persisted: true,
    state: {
      imageUrl: "https://cdn.example/hero.jpg",
      zoom: 1.4,
      positionX: 0.3,
      positionY: 0.7,
    },
  });
  mocks.clearUserDashboardHero.mockResolvedValue({
    ok: true,
    persisted: true,
    state: DEFAULT_STATE,
  });
});

afterEach(() => {
  for (const [key, value] of Object.entries(originalBlobEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("GET /api/account/dashboard-hero-image", () => {
  it("returns storage availability and hero state", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    mocks.getUserDashboardHeroState.mockResolvedValueOnce({
      imageUrl: "https://cdn.example/hero.jpg",
      zoom: 1.2,
      positionX: 0.4,
      positionY: 0.6,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      storageAvailable: true,
      imageUrl: "https://cdn.example/hero.jpg",
      transform: {
        zoom: 1.2,
        positionX: 0.4,
        positionY: 0.6,
      },
    });
    expect(mocks.getUserDashboardHeroState).toHaveBeenCalledWith("user-001");
  });

  it("reports storage available for a Vercel connected store without a static token", async () => {
    process.env.VERCEL = "1";
    process.env.BLOB_STORE_ID = "store_dashboard";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.storageAvailable).toBe(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValueOnce(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Nicht authentifiziert.");
  });
});

describe("POST /api/account/dashboard-hero-image", () => {
  it("returns 503 when BLOB_READ_WRITE_TOKEN is missing", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const request = new NextRequest("http://localhost/api/account/dashboard-hero-image", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("Speicher nicht konfiguriert");
    expect(mocks.updateUserDashboardHeroImage).not.toHaveBeenCalled();
  });

  it("returns 503 when BLOB_READ_WRITE_TOKEN is whitespace-only", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "   ";

    const request = new NextRequest("http://localhost/api/account/dashboard-hero-image", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("Speicher nicht konfiguriert");
    expect(mocks.updateUserDashboardHeroImage).not.toHaveBeenCalled();
  });

  it("persists uploaded image URL for the authenticated user", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    mocks.uploadUserDashboardHeroImage.mockResolvedValueOnce({
      ok: true,
      imageUrl: "https://cdn.example/hero.jpg",
      persisted: false,
    });

    const formData = new FormData();
    formData.append("file", new File(["hero"], "hero.png", { type: "image/png" }));

    const request = new NextRequest("http://localhost/api/account/dashboard-hero-image", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.imageUrl).toBe("https://cdn.example/hero.jpg");
    expect(body.persisted).toBe(true);
    expect(mocks.updateUserDashboardHeroImage).toHaveBeenCalledWith(
      "user-001",
      "https://cdn.example/hero.jpg",
    );
  });

  it("uploads through a Vercel connected store without requiring a static token", async () => {
    process.env.VERCEL = "1";
    process.env.BLOB_STORE_ID = "store_dashboard";
    mocks.uploadUserDashboardHeroImage.mockResolvedValueOnce({
      ok: true,
      imageUrl: "https://cdn.example/hero.jpg",
      persisted: false,
    });

    const formData = new FormData();
    formData.append("file", new File(["hero"], "hero.png", { type: "image/png" }));

    const request = new NextRequest("http://localhost/api/account/dashboard-hero-image", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.uploadUserDashboardHeroImage).toHaveBeenCalledWith(
      expect.objectContaining({ token: undefined }),
    );
  });

  it("does not persist when blob upload fails", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    mocks.uploadUserDashboardHeroImage.mockResolvedValueOnce({
      ok: false,
      status: 500,
      error: "Titelbild konnte nicht hochgeladen werden.",
    });

    const formData = new FormData();
    formData.append("file", new File(["hero"], "hero.png", { type: "image/png" }));

    const request = new NextRequest("http://localhost/api/account/dashboard-hero-image", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(mocks.updateUserDashboardHeroImage).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/account/dashboard-hero-image", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/account/dashboard-hero-image", {
      method: "PATCH",
      body: JSON.stringify({ zoom: 1.2, positionX: 0.5, positionY: 0.5 }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });

  it("persists valid transform without blob token", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const request = new NextRequest("http://localhost/api/account/dashboard-hero-image", {
      method: "PATCH",
      body: JSON.stringify({ zoom: 1.4, positionX: 0.3, positionY: 0.7 }),
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.persisted).toBe(true);
    expect(body.transform).toEqual({
      zoom: 1.4,
      positionX: 0.3,
      positionY: 0.7,
    });
    expect(mocks.updateUserDashboardHeroTransform).toHaveBeenCalledWith("user-001", {
      zoom: 1.4,
      positionX: 0.3,
      positionY: 0.7,
    });
  });

  it("rejects non-finite transform input", async () => {
    const request = new NextRequest("http://localhost/api/account/dashboard-hero-image", {
      method: "PATCH",
      body: JSON.stringify({ zoom: Number.NaN, positionX: 0.5, positionY: 0.5 }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
    expect(mocks.updateUserDashboardHeroTransform).not.toHaveBeenCalled();
  });

  it("clamps out-of-range finite transform input", async () => {
    mocks.updateUserDashboardHeroTransform.mockResolvedValueOnce({
      ok: true,
      persisted: true,
      state: {
        imageUrl: "https://cdn.example/hero.jpg",
        zoom: 2.5,
        positionX: 0,
        positionY: 1,
      },
    });

    const request = new NextRequest("http://localhost/api/account/dashboard-hero-image", {
      method: "PATCH",
      body: JSON.stringify({ zoom: 9, positionX: -1, positionY: 2 }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);
    expect(mocks.updateUserDashboardHeroTransform).toHaveBeenCalledWith("user-001", {
      zoom: 2.5,
      positionX: 0,
      positionY: 1,
    });
  });
});

describe("DELETE /api/account/dashboard-hero-image", () => {
  it("returns success when no image is stored", async () => {
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Kein Titelbild vorhanden.");
    expect(mocks.clearUserDashboardHero).not.toHaveBeenCalled();
  });

  it("clears persistent hero fields after blob cleanup", async () => {
    mocks.getUserDashboardHeroState.mockResolvedValueOnce({
      imageUrl: "https://cdn.example/hero.jpg",
      zoom: 1.2,
      positionX: 0.4,
      positionY: 0.6,
    });
    mocks.removeUserDashboardHeroImage.mockResolvedValueOnce({ ok: true, persisted: false });

    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Titelbild entfernt.");
    expect(mocks.clearUserDashboardHero).toHaveBeenCalledWith("user-001");
    expect(body.imageUrl).toBeNull();
  });
});
