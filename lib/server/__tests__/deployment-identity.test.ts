import { describe, expect, it } from "vitest";
import { resolveDeploymentIdentity } from "../deployment-identity";

const BASE_LOCAL_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "development",
};

const BASE_PREVIEW_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "preview",
  APP_ENV: "preview",
  NEXTAUTH_SECRET: "test-secret",
  DATABASE_URL: "postgresql://user:pass@preview-db.neon.tech:5432/preview_db",
  APP_BASE_URL: "https://preview.example.vercel.app",
  NEXTAUTH_URL: "https://preview.example.vercel.app",
  VERCEL_GIT_COMMIT_SHA: "abc123",
  VERCEL_GIT_COMMIT_REF: "feature/my-branch",
  VERCEL_DEPLOYMENT_ID: "dpl_abc123",
  VERCEL_URL: "preview.example.vercel.app",
};

describe("resolveDeploymentIdentity", () => {
  describe("git provenance extraction", () => {
    it("returns null commit fields for local environment without Vercel metadata", () => {
      const identity = resolveDeploymentIdentity(BASE_LOCAL_ENV);

      expect(identity.commitSha).toBeNull();
      expect(identity.commitRef).toBeNull();
      expect(identity.deploymentId).toBeNull();
      expect(identity.deploymentUrl).toBeNull();
    });

    it("extracts all Vercel provenance fields from Preview env", () => {
      const identity = resolveDeploymentIdentity(BASE_PREVIEW_ENV);

      expect(identity.commitSha).toBe("abc123");
      expect(identity.commitRef).toBe("feature/my-branch");
      expect(identity.deploymentId).toBe("dpl_abc123");
      expect(identity.deploymentUrl).toBe("preview.example.vercel.app");
      expect(identity.vercelEnv).toBe("preview");
    });
  });

  describe("environment classification", () => {
    it("classifies local dev as LOCAL", () => {
      const identity = resolveDeploymentIdentity(BASE_LOCAL_ENV);
      expect(identity.appEnvironment).toBe("LOCAL");
      expect(identity.appEnvRaw).toBe("local");
      expect(identity.isDeployed).toBe(false);
    });

    it("classifies Vercel Preview as PREVIEW", () => {
      const identity = resolveDeploymentIdentity(BASE_PREVIEW_ENV);
      expect(identity.appEnvironment).toBe("PREVIEW");
      expect(identity.appEnvRaw).toBe("preview");
      expect(identity.isDeployed).toBe(true);
    });

    it("classifies Vercel Custom Acceptance environment as ACCEPTANCE", () => {
      const identity = resolveDeploymentIdentity({
        ...BASE_PREVIEW_ENV,
        VERCEL_TARGET_ENV: "acceptance",
        APP_ENV: "stage",
      });
      expect(identity.appEnvironment).toBe("ACCEPTANCE");
      expect(identity.vercelTargetEnv).toBe("acceptance");
    });

    it("classifies STAGE when VERCEL_ENV=production and APP_ENV=stage", () => {
      const identity = resolveDeploymentIdentity({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "production",
        APP_ENV: "stage",
        NEXTAUTH_SECRET: "secret",
        DATABASE_URL: "postgresql://u:p@stage-db.neon.tech:5432/sce_stage",
        APP_BASE_URL: "https://stage.example.com",
        NEXTAUTH_URL: "https://stage.example.com",
      });
      expect(identity.appEnvironment).toBe("STAGE");
    });
  });

  describe("database identity (no secrets)", () => {
    it("extracts only the hostname from DATABASE_URL", () => {
      const identity = resolveDeploymentIdentity({
        ...BASE_LOCAL_ENV,
        DATABASE_URL: "postgresql://secretuser:secretpass@db.neon.tech:5432/mydb",
      });

      expect(identity.databaseHost).toBe("db.neon.tech");
      expect(identity.databaseFingerprint).toBeTruthy();
    });

    it("produces a consistent fingerprint for the same database", () => {
      const env = {
        ...BASE_LOCAL_ENV,
        DATABASE_URL: "postgresql://u1:p1@db.neon.tech:5432/mydb",
      };
      const env2 = {
        ...BASE_LOCAL_ENV,
        DATABASE_URL: "postgresql://u2:p2@db.neon.tech:5432/mydb",
      };

      const fp1 = resolveDeploymentIdentity(env).databaseFingerprint;
      const fp2 = resolveDeploymentIdentity(env2).databaseFingerprint;

      expect(fp1).toBe(fp2);
    });

    it("produces different fingerprints for different databases", () => {
      const env1 = {
        ...BASE_LOCAL_ENV,
        DATABASE_URL: "postgresql://u:p@db1.neon.tech:5432/mydb",
      };
      const env2 = {
        ...BASE_LOCAL_ENV,
        DATABASE_URL: "postgresql://u:p@db2.neon.tech:5432/mydb",
      };

      const fp1 = resolveDeploymentIdentity(env1).databaseFingerprint;
      const fp2 = resolveDeploymentIdentity(env2).databaseFingerprint;

      expect(fp1).not.toBe(fp2);
    });

    it("returns null database fields when DATABASE_URL is absent", () => {
      const identity = resolveDeploymentIdentity(BASE_LOCAL_ENV);
      expect(identity.databaseHost).toBeNull();
      expect(identity.databaseFingerprint).toBeNull();
    });

    it("never includes DATABASE_URL credentials in any returned field", () => {
      const identity = resolveDeploymentIdentity({
        ...BASE_LOCAL_ENV,
        DATABASE_URL:
          "postgresql://SECRETUSER:SECRETPASS@db.neon.tech:5432/mydb",
      });

      const serialized = JSON.stringify(identity);
      expect(serialized).not.toContain("SECRETUSER");
      expect(serialized).not.toContain("SECRETPASS");
    });
  });

  describe("auth configuration presence", () => {
    it("reports hasNextAuthSecret=false when missing", () => {
      const identity = resolveDeploymentIdentity(BASE_LOCAL_ENV);
      expect(identity.authConfigured.hasNextAuthSecret).toBe(false);
    });

    it("reports hasNextAuthSecret=true when present", () => {
      const identity = resolveDeploymentIdentity({
        ...BASE_LOCAL_ENV,
        NEXTAUTH_SECRET: "secret",
      });
      expect(identity.authConfigured.hasNextAuthSecret).toBe(true);
    });

    it("never includes the NEXTAUTH_SECRET value in any returned field", () => {
      const identity = resolveDeploymentIdentity({
        ...BASE_LOCAL_ENV,
        NEXTAUTH_SECRET: "SUPERSECRETVALUE",
      });

      const serialized = JSON.stringify(identity);
      expect(serialized).not.toContain("SUPERSECRETVALUE");
    });
  });

  describe("identity validation", () => {
    it("PASS when a fully configured Preview environment is provided", () => {
      const identity = resolveDeploymentIdentity(BASE_PREVIEW_ENV);
      expect(identity.identityValid).toBe("PASS");
      expect(identity.identityViolations).toHaveLength(0);
    });

    it("FAIL when NEXTAUTH_SECRET is missing in deployed context", () => {
      const { NEXTAUTH_SECRET: _, ...envWithoutSecret } = BASE_PREVIEW_ENV;
      const identity = resolveDeploymentIdentity(envWithoutSecret);

      expect(identity.identityValid).toBe("FAIL");
      expect(identity.identityViolations.some((v) => v.includes("NEXTAUTH_SECRET"))).toBe(true);
    });

    it("FAIL when DATABASE_URL is missing in deployed context", () => {
      const { DATABASE_URL: _, ...envWithoutDb } = BASE_PREVIEW_ENV;
      const identity = resolveDeploymentIdentity(envWithoutDb);

      expect(identity.identityValid).toBe("FAIL");
      expect(identity.identityViolations.some((v) => v.includes("DATABASE_URL"))).toBe(true);
    });

    it("FAIL when environment is unknown in deployed context", () => {
      const identity = resolveDeploymentIdentity({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "production",
        APP_ENV: "invalid-value",
        NEXTAUTH_SECRET: "secret",
        DATABASE_URL: "postgresql://u:p@db.neon.tech:5432/db",
      });

      expect(identity.identityValid).toBe("FAIL");
    });

    it("PASS for a fully configured local environment (no deployment required)", () => {
      const identity = resolveDeploymentIdentity({
        NODE_ENV: "development",
        APP_ENV: "local",
        NEXTAUTH_SECRET: "local-secret",
        DATABASE_URL: "postgresql://u:p@localhost:5432/sce_local",
        APP_BASE_URL: "http://localhost:3000",
        NEXTAUTH_URL: "http://localhost:3000",
      });

      expect(identity.identityValid).toBe("PASS");
    });
  });
});
