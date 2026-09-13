import { describe, expect, it } from "vitest";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
  requireBillingDataEnvironment,
  resolveRuntimeIdentity,
  RuntimeDataEnvironmentError,
} from "../runtime-identity";

const stageUrl = "postgresql://user:secret@stage.example.test:5432/sce_stage";

function previewStageEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    APP_ENV: "preview",
    SCE_DATA_ENVIRONMENT: "STAGE",
    DATABASE_URL: stageUrl,
  };
  env.SCE_DATA_DATABASE_FINGERPRINT =
    getDatabaseFingerprintFromEffectivePrismaSource(env)!;
  return env;
}

describe("canonical runtime identity", () => {
  it("keeps Preview deployment separate from STAGE data", () => {
    const identity = resolveRuntimeIdentity(previewStageEnv());
    expect(identity).toMatchObject({
      deploymentEnvironment: "PREVIEW",
      dataEnvironment: "STAGE",
      databaseFingerprintMatchesConfiguredTarget: true,
    });
  });

  it("derives database identity from the effective Prisma source", () => {
    const env = previewStageEnv();
    env.STAGE_DB_URL = "postgresql://other:secret@wrong.test/other";
    expect(resolveRuntimeIdentity(env).databaseFingerprint).toBe(
      getDatabaseFingerprintFromEffectivePrismaSource(env),
    );
  });

  it("fails closed for the wrong data environment", () => {
    const env = previewStageEnv();
    env.SCE_DATA_ENVIRONMENT = "ACCEPTANCE";
    expect(() => requireBillingDataEnvironment("STAGE", env)).toThrow(
      RuntimeDataEnvironmentError,
    );
  });

  it("fails closed when data environment is missing", () => {
    const env = previewStageEnv();
    delete env.SCE_DATA_ENVIRONMENT;
    expect(getRuntimeDataEnvironment(env)).toBe("UNKNOWN");
    expect(() => requireBillingDataEnvironment("STAGE", env)).toThrow(
      expect.objectContaining({ code: "DATA_ENVIRONMENT_MISSING" }),
    );
  });

  it("fails closed when effective database identity is not attested", () => {
    const env = previewStageEnv();
    env.SCE_DATA_DATABASE_FINGERPRINT = "0000000000000000";
    expect(() => requireBillingDataEnvironment("STAGE", env)).toThrow(
      expect.objectContaining({ code: "DATABASE_IDENTITY_UNPROVEN" }),
    );
  });
});
