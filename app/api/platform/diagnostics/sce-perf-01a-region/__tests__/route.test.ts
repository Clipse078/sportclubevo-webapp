import { describe, it, expect, beforeEach, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mockGetRuntimeEnvironment = vi.fn();
const mockRequireApiPermission = vi.fn();
const mockCollectPerf01aRegionProof = vi.fn();

vi.mock("@/lib/env", () => ({
  getRuntimeEnvironment: mockGetRuntimeEnvironment,
}));

vi.mock("@/lib/permissions/require-api-permission", () => ({
  requireApiPermission: mockRequireApiPermission,
}));

vi.mock("@/lib/diagnostics/sce-perf-01a-region-proof", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/diagnostics/sce-perf-01a-region-proof")
  >();
  return {
    ...actual,
    collectPerf01aRegionProof: mockCollectPerf01aRegionProof,
  };
});

const { GET } = await import("../route");

function previewRuntime() {
  return {
    isProd: false,
    isPreview: true,
    isStage: false,
  };
}

function prodRuntime() {
  return {
    isProd: true,
    isPreview: false,
    isStage: false,
  };
}

function platformOperatorSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "platform-1",
      effectiveUserId: "platform-1",
      actorUserId: "platform-1",
      isImpersonating: false,
      activeTenantId: "tenant-1",
      ...overrides,
    },
  };
}

function accessOk(session: ReturnType<typeof platformOperatorSession>) {
  return {
    ok: true,
    status: 200,
    error: null,
    session,
  };
}

describe("GET /api/platform/diagnostics/sce-perf-01a-region", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeEnvironment.mockReturnValue(previewRuntime());
    mockRequireApiPermission.mockResolvedValue(accessOk(platformOperatorSession()));
    mockCollectPerf01aRegionProof.mockResolvedValue({
      vercelRegion: "iad1",
      databaseRegion: "eu-central-1",
      select1: {
        samplesMs: [12.1, 11.4, 10.9, 11.2, 12.0],
        p50Ms: 11.4,
        p95Ms: 12.1,
      },
    });
  });

  it("rejects unauthenticated requests", async () => {
    mockRequireApiPermission.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
      session: null,
    });

    const response = await GET();
    expect(response.status).toBe(401);
    expect(mockCollectPerf01aRegionProof).not.toHaveBeenCalled();
  });

  it("rejects ordinary tenant users without TENANTS_MANAGE", async () => {
    mockRequireApiPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: platformOperatorSession({ id: "tenant-user-1" }),
    });

    const response = await GET();
    expect(response.status).toBe(403);
    expect(mockCollectPerf01aRegionProof).not.toHaveBeenCalled();
  });

  it("rejects impersonated platform sessions", async () => {
    mockRequireApiPermission.mockResolvedValue(
      accessOk(
        platformOperatorSession({
          id: "tenant-user-1",
          effectiveUserId: "tenant-user-1",
          actorUserId: "platform-1",
          isImpersonating: true,
        }),
      ),
    );

    const response = await GET();
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: "Forbidden" });
    expect(mockCollectPerf01aRegionProof).not.toHaveBeenCalled();
  });

  it("rejects stale identity mismatch without impersonation flag", async () => {
    mockRequireApiPermission.mockResolvedValue(
      accessOk(
        platformOperatorSession({
          id: "tenant-user-1",
          effectiveUserId: "tenant-user-1",
          actorUserId: "platform-1",
          isImpersonating: false,
        }),
      ),
    );

    const response = await GET();
    expect(response.status).toBe(403);
    expect(mockCollectPerf01aRegionProof).not.toHaveBeenCalled();
  });

  it("accepts authorized non-impersonated platform operators", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mockRequireApiPermission).toHaveBeenCalledWith(PERMISSIONS.TENANTS_MANAGE);
    expect(mockCollectPerf01aRegionProof).toHaveBeenCalledTimes(1);
  });

  it("rejects PROD before auth", async () => {
    mockGetRuntimeEnvironment.mockReturnValue(prodRuntime());

    const response = await GET();
    expect(response.status).toBe(403);
    expect(mockRequireApiPermission).not.toHaveBeenCalled();
    expect(mockCollectPerf01aRegionProof).not.toHaveBeenCalled();
  });

  it("returns expected shape without secrets", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://user:super-secret@ep-test.eu-central-1.aws.neon.tech/db",
    );

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual({
      vercelRegion: "iad1",
      databaseRegion: "eu-central-1",
      select1: {
        samplesMs: [12.1, 11.4, 10.9, 11.2, 12.0],
        p50Ms: 11.4,
        p95Ms: 12.1,
      },
    });

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("super-secret");
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain("DATABASE_URL");
    expect(serialized).not.toContain("ep-test");
    expect(serialized).not.toContain("platform-1");
    expect(serialized).not.toContain("tenant-1");

    vi.unstubAllEnvs();
  });
});
