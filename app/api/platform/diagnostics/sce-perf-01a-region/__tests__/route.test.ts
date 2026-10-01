import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGetRuntimeEnvironment = vi.fn();
const mockRequirePlatformApiPermission = vi.fn();
const mockCollectPerf01aRegionProof = vi.fn();

vi.mock("@/lib/env", () => ({
  getRuntimeEnvironment: mockGetRuntimeEnvironment,
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mockRequirePlatformApiPermission,
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

describe("GET /api/platform/diagnostics/sce-perf-01a-region", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeEnvironment.mockReturnValue(previewRuntime());
    mockRequirePlatformApiPermission.mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      session: {},
      actorUserId: "user-1",
    });
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

  it("rejects unauthorized requests", async () => {
    mockRequirePlatformApiPermission.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
      session: null,
      actorUserId: null,
    });

    const response = await GET();
    expect(response.status).toBe(401);
    expect(mockCollectPerf01aRegionProof).not.toHaveBeenCalled();
  });

  it("rejects PROD", async () => {
    mockGetRuntimeEnvironment.mockReturnValue(prodRuntime());

    const response = await GET();
    expect(response.status).toBe(403);
    expect(mockRequirePlatformApiPermission).not.toHaveBeenCalled();
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

    vi.unstubAllEnvs();
  });

  it("uses read-only SELECT 1 collection via shared helper", async () => {
    await GET();
    expect(mockCollectPerf01aRegionProof).toHaveBeenCalledTimes(1);
  });
});
