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

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUserDashboardHeroImageUrl: vi.fn(),
  persistUserDashboardHeroImageUrl: vi.fn(),
  uploadUserDashboardHeroImage: vi.fn(),
  removeUserDashboardHeroImage: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/dashboard/dashboard-hero-image", () => ({
  getUserDashboardHeroImageUrl: mocks.getUserDashboardHeroImageUrl,
  persistUserDashboardHeroImageUrl: mocks.persistUserDashboardHeroImageUrl,
}));

vi.mock("@/lib/dashboard/dashboard-hero-image-shared", () => ({
  uploadUserDashboardHeroImage: mocks.uploadUserDashboardHeroImage,
  removeUserDashboardHeroImage: mocks.removeUserDashboardHeroImage,
}));

import { NextRequest } from "next/server";
import { DELETE, GET, POST } from "@/app/api/account/dashboard-hero-image/route";

const originalToken = process.env.BLOB_READ_WRITE_TOKEN;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: SESSION_USER });
  mocks.getUserDashboardHeroImageUrl.mockResolvedValue(null);
  mocks.persistUserDashboardHeroImageUrl.mockResolvedValue({
    ok: true,
    persisted: false,
    reason: "schema_migration_pending",
  });
});

afterEach(() => {
  if (originalToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = originalToken;
});

describe("GET /api/account/dashboard-hero-image", () => {
  it("returns storage availability and persistencePending", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      storageAvailable: true,
      imageUrl: null,
      persistencePending: true,
    });
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
  });

  it("returns uploaded image URL with persistencePending", async () => {
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
    expect(body.persistencePending).toBe(true);
  });
});

describe("DELETE /api/account/dashboard-hero-image", () => {
  it("returns success when no image is stored", async () => {
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Kein Titelbild vorhanden.");
  });
});
