import { describe, expect, it } from "vitest";
import { runDeploymentPreflight } from "../deployment-preflight";

const LOCAL_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "development",
  APP_ENV: "local",
};

const VALID_PREVIEW_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "preview",
  APP_ENV: "preview",
  NEXTAUTH_SECRET: "secret",
  DATABASE_URL: "postgresql://u:p@preview-db.neon.tech:5432/preview_db",
  APP_BASE_URL: "https://preview.vercel.app",
  NEXTAUTH_URL: "https://preview.vercel.app",
};

const VALID_STAGE_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production",
  APP_ENV: "stage",
  NEXTAUTH_SECRET: "stage-secret",
  DATABASE_URL: "postgresql://u:p@stage-db.neon.tech:5432/sce_stage",
  APP_BASE_URL: "https://stage.example.com",
  NEXTAUTH_URL: "https://stage.example.com",
};

describe("runDeploymentPreflight", () => {
  describe("local environment", () => {
    it("passes for a minimal local dev environment", () => {
      const result = runDeploymentPreflight(LOCAL_ENV);
      expect(result.pass).toBe(true);
    });

    it("produces only warnings (not errors) for incomplete local config", () => {
      const result = runDeploymentPreflight({ NODE_ENV: "development" });
      const errors = result.violations.filter((v) => v.severity === "error");
      expect(errors).toHaveLength(0);
    });
  });

  describe("valid deployed environments", () => {
    it("passes for a valid Preview environment", () => {
      const result = runDeploymentPreflight(VALID_PREVIEW_ENV);
      expect(result.pass).toBe(true);
      const errors = result.violations.filter((v) => v.severity === "error");
      expect(errors).toHaveLength(0);
    });

    it("warns when Preview has DATABASE_URL but no billing encryption key", () => {
      const result = runDeploymentPreflight(VALID_PREVIEW_ENV);
      expect(
        result.violations.some(
          (v) => v.code === "BILLING_ENCRYPTION_KEY_MISSING_PREVIEW",
        ),
      ).toBe(true);
    });

    it("passes for a valid STAGE environment", () => {
      const result = runDeploymentPreflight(VALID_STAGE_ENV);
      expect(result.pass).toBe(true);
    });
  });

  describe("missing required auth configuration", () => {
    it("fails when NEXTAUTH_SECRET is absent in deployed context", () => {
      const { NEXTAUTH_SECRET: _, ...env } = VALID_PREVIEW_ENV;
      const result = runDeploymentPreflight(env);

      expect(result.pass).toBe(false);
      expect(
        result.violations.some((v) => v.code === "AUTH_SECRET_MISSING"),
      ).toBe(true);
    });

    it("fails when DATABASE_URL is absent in deployed context", () => {
      const { DATABASE_URL: _, ...env } = VALID_PREVIEW_ENV;
      const result = runDeploymentPreflight(env);

      expect(result.pass).toBe(false);
      expect(
        result.violations.some((v) => v.code === "DATABASE_URL_MISSING"),
      ).toBe(true);
    });
  });

  describe("environment/database identity mismatch", () => {
    it("allows configured APP_ENV=stage on a plain Preview because Preview classification is authoritative", () => {
      const result = runDeploymentPreflight({
        ...VALID_PREVIEW_ENV,
        APP_ENV: "stage",
      });

      expect(result.pass).toBe(true);
      expect(
        result.violations.some(
          (v) => v.code === "BILLING_ENCRYPTION_KEY_MISSING_PREVIEW",
        ),
      ).toBe(true);
    });

    it("does not flag APP_ENV=stage on a Vercel Custom Environment (VERCEL_TARGET_ENV set)", () => {
      const result = runDeploymentPreflight({
        ...VALID_PREVIEW_ENV,
        VERCEL_TARGET_ENV: "acceptance",
        APP_ENV: "stage",
        NEXTAUTH_SECRET: "s",
      });

      const mismatchErrors = result.violations.filter(
        (v) => v.code === "ENV_APP_ENV_VERCEL_MISMATCH",
      );
      expect(mismatchErrors).toHaveLength(0);
    });

    it("fails when STAGE points to an Acceptance database host", () => {
      const result = runDeploymentPreflight({
        ...VALID_STAGE_ENV,
        DATABASE_URL: "postgresql://u:p@acceptance-db.neon.tech:5432/sce_stage",
        ACCEPTANCE_DATABASE_HOST: "acceptance-db.neon.tech",
      });

      expect(result.pass).toBe(false);
      expect(
        result.violations.some((v) => v.code === "STAGE_TARGETING_ACCEPTANCE_DB"),
      ).toBe(true);
    });

    it("fails when Acceptance points to STAGE database host", () => {
      const result = runDeploymentPreflight({
        ...VALID_STAGE_ENV,
        VERCEL_ENV: "preview",
        VERCEL_TARGET_ENV: "acceptance",
        APP_ENV: "stage",
        DATABASE_URL: "postgresql://u:p@stage-db.neon.tech:5432/sce_acc",
        STAGE_DB_URL: "postgresql://u:p@stage-db.neon.tech:5432/sce_stage",
      });

      expect(result.pass).toBe(false);
      expect(
        result.violations.some(
          (v) => v.code === "ACCEPTANCE_TARGETING_STAGE_DB",
        ),
      ).toBe(true);
    });

    it("allows Preview to use the configured persistent STAGE database host", () => {
      const result = runDeploymentPreflight({
        ...VALID_PREVIEW_ENV,
        DATABASE_URL: "postgresql://u:p@stage-db.neon.tech:5432/stage_db",
        STAGE_DB_URL: "postgresql://u:p@stage-db.neon.tech:5432/sce_stage",
      });

      expect(result.pass).toBe(true);
      expect(
        result.violations.some(
          (v) => v.code === "BILLING_ENCRYPTION_KEY_MISSING_PREVIEW",
        ),
      ).toBe(true);
    });
  });

  describe("malformed DATABASE_URL", () => {
    it("fails when DATABASE_URL is present but malformed", () => {
      const result = runDeploymentPreflight({
        ...VALID_PREVIEW_ENV,
        DATABASE_URL: "not-a-valid-url",
      });

      expect(result.pass).toBe(false);
      expect(
        result.violations.some((v) => v.code === "DATABASE_URL_MALFORMED"),
      ).toBe(true);
    });

    it("fails when DATABASE_URL has non-postgres scheme", () => {
      const result = runDeploymentPreflight({
        ...VALID_PREVIEW_ENV,
        DATABASE_URL: "mysql://u:p@db.example.com:3306/mydb",
      });

      expect(result.pass).toBe(false);
      expect(
        result.violations.some((v) => v.code === "DATABASE_URL_MALFORMED"),
      ).toBe(true);
    });
  });

  describe("unknown environment classification", () => {
    it("fails when deployed runtime has unknown classification", () => {
      const result = runDeploymentPreflight({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "production",
        APP_ENV: "not-a-valid-env",
        NEXTAUTH_SECRET: "secret",
        DATABASE_URL: "postgresql://u:p@db.neon.tech:5432/db",
      });

      expect(result.pass).toBe(false);
      expect(
        result.violations.some((v) => v.code === "ENV_UNKNOWN"),
      ).toBe(true);
    });
  });

  describe("ordinary development must not be blocked", () => {
    it("local build without DATABASE_URL is a warning not an error", () => {
      const result = runDeploymentPreflight({
        NODE_ENV: "development",
        APP_ENV: "local",
      });

      expect(result.pass).toBe(true);
      const errors = result.violations.filter((v) => v.severity === "error");
      expect(errors).toHaveLength(0);
    });
  });
});
