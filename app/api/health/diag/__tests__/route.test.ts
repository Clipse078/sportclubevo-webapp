/**
 * Pure route tests: authorization, runtime, identity, deployment, and database
 * checks are mocked. No Prisma client, network service, or persistent state
 * is used.
 */
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

const baseRuntimeResult = {
  ok: true,
  env: {
    hasDatabaseUrl: true,
    hasDirectUrl: true,
    hasNextAuthSecret: true,
    appBaseUrl: "https://sce.example",
    nextAuthUrl: "https://sce.example",
    appEnv: "stage",
    nodeEnv: "production",
    vercelEnv: "production",
    isLocal: false,
    isPreview: false,
    isAcceptance: false,
    isDeployed: true,
    isStage: true,
    isProd: false,
  },
  warnings: [],
  errors: [],
};

const baseIdentityResult = {
  commitSha: "abc123",
  commitRef: "main",
  deploymentId: "dpl_abc123",
  deploymentUrl: "stage.example.com",
  vercelEnv: "production",
  vercelTargetEnv: null,
  appEnvironment: "STAGE",
  appEnvRaw: "stage",
  isDeployed: true,
  databaseHost: "stage-db.neon.tech",
  databaseFingerprint: "fingerprint123",
  authConfigured: {
    hasNextAuthSecret: true,
    hasDatabaseUrl: true,
    hasNextAuthUrl: true,
    hasAppBaseUrl: true,
  },
  identityValid: "PASS" as const,
  identityViolations: [],
};

describe("GET /api/health/diag authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiPermission.mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      session: { user: { id: "sce-admin" } },
    });
    mocks.evaluateRuntimeConfiguration.mockReturnValue(baseRuntimeResult);
    mocks.checkDatabaseHealth.mockResolvedValue({
      ok: true,
      message: "Database connection successful.",
    });
    mocks.resolveDeploymentIdentity.mockReturnValue(baseIdentityResult);
  });

  it("returns no diagnostic payload to an unauthenticated caller", async () => {
    mocks.requireApiPermission.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
      session: null,
    });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.evaluateRuntimeConfiguration).not.toHaveBeenCalled();
    expect(mocks.checkDatabaseHealth).not.toHaveBeenCalled();
    expect(mocks.resolveDeploymentIdentity).not.toHaveBeenCalled();
  });

  it("uses the established platform users.manage permission", async () => {
    await GET();
    expect(mocks.requireApiPermission).toHaveBeenCalledWith("users.manage");
  });

  it("returns full diagnostic payload for an authorized SCE administrator", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.healthOk).toBe(true);
    expect(body.deployment.commitSha).toBe("abc123");
    expect(body.deployment.commitRef).toBe("main");
    expect(body.database.host).toBe("stage-db.neon.tech");
    expect(body.database.fingerprint).toBe("fingerprint123");
    expect(body.identity.identityValid).toBe("PASS");
  });

  it("reports three-phase status correctly when all phases pass", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.phases.CONFIGURED).toBe(true);
    expect(body.phases.CONNECTED).toBe(true);
    expect(body.phases.IDENTITY_VALIDATED).toBe(true);
  });

  it("reports CONFIGURED=false when NEXTAUTH_SECRET is missing", async () => {
    mocks.resolveDeploymentIdentity.mockReturnValue({
      ...baseIdentityResult,
      authConfigured: {
        ...baseIdentityResult.authConfigured,
        hasNextAuthSecret: false,
      },
      identityValid: "FAIL" as const,
      identityViolations: ["NEXTAUTH_SECRET is not configured."],
    });

    const response = await GET();
    const body = await response.json();

    expect(body.phases.CONFIGURED).toBe(false);
    expect(body.phases.CONNECTED).toBe(false);
    expect(body.phases.IDENTITY_VALIDATED).toBe(false);
    expect(body.identity.identityValid).toBe("FAIL");
    expect(body.identity.identityViolations.length).toBeGreaterThan(0);
  });

  it("reports CONNECTED=false when database is unreachable", async () => {
    mocks.checkDatabaseHealth.mockResolvedValue({
      ok: false,
      message: "Connection refused",
    });

    const response = await GET();
    const body = await response.json();

    expect(body.phases.CONFIGURED).toBe(true);
    expect(body.phases.CONNECTED).toBe(false);
    expect(body.phases.IDENTITY_VALIDATED).toBe(false);
  });

  it("does not include DATABASE_URL credentials in the response", async () => {
    const response = await GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain("postgresql://");
  });

  it("always returns 200 even when identity validation fails", async () => {
    mocks.resolveDeploymentIdentity.mockReturnValue({
      ...baseIdentityResult,
      identityValid: "FAIL" as const,
      identityViolations: ["Some violation"],
    });
    mocks.evaluateRuntimeConfiguration.mockReturnValue({
      ...baseRuntimeResult,
      ok: false,
      errors: ["Runtime invalid"],
    });

    const response = await GET();
    expect(response.status).toBe(200);
  });
});
