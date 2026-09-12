/** Pure route tests; no database or network service is used. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  evaluateRuntimeConfiguration: vi.fn(),
  checkDatabaseHealth: vi.fn(),
  resolveDeploymentIdentity: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-permission", () => ({
  requireApiPermission: mocks.requireApiPermission,
}));

vi.mock("@/lib/server/runtime", () => ({
  evaluateRuntimeConfiguration: mocks.evaluateRuntimeConfiguration,
  checkDatabaseHealth: mocks.checkDatabaseHealth,
}));

vi.mock("@/lib/server/deployment-identity", () => ({
  resolveDeploymentIdentity: mocks.resolveDeploymentIdentity,
}));

const { GET } = await import("../route");

const identity = {
  commitSha: "abc123",
  commitRef: "feature/dashboard-command-center-v3",
  deploymentId: "dpl_abc123",
  deploymentUrl: "preview.example.vercel.app",
  vercelEnv: "preview",
  vercelTargetEnv: null,
  appEnvironment: "PREVIEW",
  appEnvRaw: "preview",
  isDeployed: true,
  databaseHost: "stage-db.neon.tech",
  databaseFingerprint: "fingerprint123",
  authConfigured: {
    hasNextAuthSecret: true,
    hasDatabaseUrl: true,
    hasBillingEncryptionKey: false,
    hasNextAuthUrl: true,
    hasAppBaseUrl: true,
  },
  identityValid: "PASS",
  identityViolations: [],
};

describe("GET /api/health/diag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiPermission.mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      session: { user: { id: "sce-admin" } },
    });
    mocks.evaluateRuntimeConfiguration.mockReturnValue({
      ok: true,
      env: {
        hasDatabaseUrl: true,
        hasDirectUrl: true,
        hasNextAuthSecret: true,
        appBaseUrl: "https://sce.example",
        nextAuthUrl: "https://sce.example",
        appEnv: "preview",
        nodeEnv: "production",
        vercelEnv: "preview",
        isLocal: false,
        isPreview: true,
        isAcceptance: false,
        isDeployed: true,
        isStage: false,
        isProd: false,
      },
      warnings: [],
      errors: [],
    });
    mocks.checkDatabaseHealth.mockResolvedValue({
      ok: true,
      message: "Database connection successful.",
    });
    mocks.resolveDeploymentIdentity.mockReturnValue(identity);
  });

  it("returns the safe identity subset to an unauthenticated caller", async () => {
    mocks.requireApiPermission.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
      session: null,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.access).toBe("public");
    expect(body.deployment).toEqual({
      commitSha: "abc123",
      commitRef: "feature/dashboard-command-center-v3",
      vercelEnvironment: "preview",
      vercelTargetEnv: null,
      appEnvironment: "PREVIEW",
    });
    expect(body.database).toEqual({
      host: "stage-db.neon.tech",
      fingerprint: "fingerprint123",
    });
    expect(body.checks.hasNextAuthSecret).toBe(true);
    expect(mocks.evaluateRuntimeConfiguration).not.toHaveBeenCalled();
    expect(mocks.checkDatabaseHealth).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("dpl_abc123");
    expect(JSON.stringify(body)).not.toContain("preview.example.vercel.app");
  });

  it("adds deeper diagnostics for an authorized SCE administrator", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.requireApiPermission).toHaveBeenCalledWith("users.manage");
    expect(body.access).toBe("authorized");
    expect(body.healthOk).toBe(true);
    expect(body.deployment.deploymentId).toBe("dpl_abc123");
    expect(body.database.connectivity.ok).toBe(true);
    expect(body.phases.IDENTITY_VALIDATED).toBe(true);
  });

  it("falls back to the public subset when auth evaluation throws", async () => {
    mocks.requireApiPermission.mockRejectedValue(new Error("auth unavailable"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.access).toBe("public");
    expect(body.identity.identityValid).toBe("PASS");
  });

  it("never exposes credential or connection-string values", async () => {
    const response = await GET();
    const serialized = JSON.stringify(await response.json());

    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("NEXTAUTH_SECRET");
  });
});
