import { beforeEach, describe, expect, it, vi } from "vitest";
const mockGetRuntimeEnvironment = vi.fn();
const mockRequirePlatformWorkspaceOperator = vi.fn();
const mockCollectPerf01aRegionProof = vi.fn();
const mockNotFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
const mockRedirect = vi.fn((url: string): never => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("@/lib/env", () => ({
  getRuntimeEnvironment: mockGetRuntimeEnvironment,
}));

vi.mock("@/lib/permissions/require-platform-operator-permission", () => ({
  requirePlatformWorkspaceOperator: mockRequirePlatformWorkspaceOperator,
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

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
  redirect: mockRedirect,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

const PerformanceRegionDiagnosticPage = (
  await import("../page")
).default;

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

function samplePayload() {
  return {
    vercelRegion: "iad1",
    databaseRegion: "eu-central-1",
    select1: {
      samplesMs: [12.1, 11.4, 10.9, 11.2, 12.0],
      p50Ms: 11.4,
      p95Ms: 12.1,
    },
  };
}

describe("/dashboard/platform/diagnostics/performance-region", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeEnvironment.mockReturnValue(previewRuntime());
    mockRequirePlatformWorkspaceOperator.mockResolvedValue({
      user: { id: "platform-1" },
    });
    mockCollectPerf01aRegionProof.mockResolvedValue(samplePayload());
  });

  it("rejects PROD via notFound", async () => {
    mockGetRuntimeEnvironment.mockReturnValue(prodRuntime());
    await expect(PerformanceRegionDiagnosticPage()).rejects.toThrow("NOT_FOUND");
    expect(mockRequirePlatformWorkspaceOperator).not.toHaveBeenCalled();
  });

  it("requires platform workspace operator gate", async () => {
    await PerformanceRegionDiagnosticPage();
    expect(mockRequirePlatformWorkspaceOperator).toHaveBeenCalled();
  });

  it("rejects unauthenticated users when gate redirects to login", async () => {
    mockRequirePlatformWorkspaceOperator.mockImplementation(() => {
      throw new Error("REDIRECT:/login");
    });
    await expect(PerformanceRegionDiagnosticPage()).rejects.toThrow("REDIRECT:/login");
    expect(mockCollectPerf01aRegionProof).not.toHaveBeenCalled();
  });

  it("rejects tenant users when gate redirects to dashboard", async () => {
    mockRequirePlatformWorkspaceOperator.mockImplementation(() => {
      throw new Error("REDIRECT:/dashboard");
    });
    await expect(PerformanceRegionDiagnosticPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mockCollectPerf01aRegionProof).not.toHaveBeenCalled();
  });

  it("rejects impersonated sessions when gate redirects to dashboard", async () => {
    mockRequirePlatformWorkspaceOperator.mockImplementation(() => {
      throw new Error("REDIRECT:/dashboard");
    });
    await expect(PerformanceRegionDiagnosticPage()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("renders for authorized platform operator on Preview", async () => {
    const page = await PerformanceRegionDiagnosticPage();
    expect(page).toBeTruthy();
    expect(mockCollectPerf01aRegionProof).toHaveBeenCalled();
  });

  it("payload rendering contains no secrets", async () => {
    const page = await PerformanceRegionDiagnosticPage();
    const serialized = JSON.stringify(page);
    expect(serialized).toContain("iad1");
    expect(serialized).toContain("eu-central-1");
    expect(serialized).not.toMatch(/postgresql/i);
    expect(serialized).not.toMatch(/secret/i);
    expect(serialized).not.toMatch(/password/i);
    expect(serialized).not.toMatch(/neon\.tech/i);
  });
});
