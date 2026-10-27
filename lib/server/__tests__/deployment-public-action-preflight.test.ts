import { describe, expect, it } from "vitest";

import { runDeploymentPreflight } from "../deployment-preflight";
import {
  collectPreviewPublicActionPreflightViolations,
  isFinanceExternalDistributionReady,
} from "../deployment-public-action-preflight";
import { getDatabaseFingerprintFromEffectivePrismaSource } from "../runtime-identity";
import { requirePublicActionTargetForFinanceDistribution } from "../public-action-target";
import { FinanceDomainError } from "@/lib/finance/errors";

const CANONICAL = "https://fcallschwil.sportclubevo.com";
const PREVIEW_HOST = "sportclubevo-webapp-stage-git-curs-46608a.vercel.app";
const stageUrl = "postgresql://u:p@stage-db.neon.tech:5432/sce_stage";
const stageFingerprint = getDatabaseFingerprintFromEffectivePrismaSource({
  NODE_ENV: "production",
  DATABASE_URL: stageUrl,
})!;

function protectedFeaturePreviewEnv(
  overrides: Partial<NodeJS.ProcessEnv> = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    APP_ENV: "stage",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    APP_BASE_URL: CANONICAL,
    NEXTAUTH_URL: CANONICAL,
    NEXTAUTH_SECRET: "preview-secret",
    VERCEL_URL: PREVIEW_HOST,
    DATABASE_URL: stageUrl,
    STAGE_DB_URL: stageUrl,
    SCE_DATA_ENVIRONMENT: "STAGE",
    SCE_DATA_DATABASE_FINGERPRINT: stageFingerprint,
    ...overrides,
  };
}

const VALID_STAGE_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production",
  APP_ENV: "stage",
  NEXTAUTH_SECRET: "stage-secret",
  DATABASE_URL: stageUrl,
  SCE_DATA_ENVIRONMENT: "STAGE",
  SCE_DATA_DATABASE_FINGERPRINT: stageFingerprint,
  APP_BASE_URL: CANONICAL,
  NEXTAUTH_URL: CANONICAL,
};

describe("deployment public-action preflight (FIN-06E vs Preview deployability)", () => {
  it("CASE 1 â STAGE canonical tenant origin: deploy pass, distribution ready", () => {
    const result = runDeploymentPreflight(VALID_STAGE_ENV);
    expect(result.pass).toBe(true);
    expect(isFinanceExternalDistributionReady(VALID_STAGE_ENV)).toBe(true);
  });

  it("CASE 2 â protected Preview without public external origin: deploy pass, distribution not ready", () => {
    const env = protectedFeaturePreviewEnv();
    const result = runDeploymentPreflight(env);

    expect(result.pass).toBe(true);
    expect(isFinanceExternalDistributionReady(env)).toBe(false);
    expect(
      result.violations.some((v) => v.code === "FINANCE_EXTERNAL_DISTRIBUTION_NOT_READY"),
    ).toBe(true);
    expect(
      result.violations.some((v) => v.code === "PREVIEW_PUBLIC_ACTION_NOT_EXTERNALLY_REACHABLE"),
    ).toBe(false);
  });

  it("CASE 3 â protected Preview distribution send is blocked before provider call", () => {
    const env = protectedFeaturePreviewEnv();
    expect(() => requirePublicActionTargetForFinanceDistribution(env)).toThrow(
      FinanceDomainError,
    );
  });

  it("CASE 4 â Preview with valid externally reachable public-action origin: deploy pass, distribution ready", () => {
    const custom = "https://fin-06e-preview.fcallschwil.ch";
    const env = protectedFeaturePreviewEnv({
      PUBLIC_ACTION_BASE_URL: custom,
      PUBLIC_ACTION_EXTERNALLY_REACHABLE: "confirmed",
    });
    const result = runDeploymentPreflight(env);

    expect(result.pass).toBe(true);
    expect(isFinanceExternalDistributionReady(env)).toBe(true);
    expect(
      result.violations.some((v) => v.code === "FINANCE_EXTERNAL_DISTRIBUTION_NOT_READY"),
    ).toBe(false);
  });

  it("CASE 5 â misconfigured PUBLIC_ACTION_BASE_URL on Preview fails closed at preflight", () => {
    const env = protectedFeaturePreviewEnv({
      PUBLIC_ACTION_BASE_URL: CANONICAL,
    });
    const violations = collectPreviewPublicActionPreflightViolations(env);

    expect(violations.some((v) => v.code === "PREVIEW_PUBLIC_ACTION_BASE_URL_MISCONFIGURED")).toBe(
      true,
    );
    expect(runDeploymentPreflight(env).pass).toBe(false);
    expect(isFinanceExternalDistributionReady(env)).toBe(false);
  });

  it("CASE 6 â recipient URLs must not embed bypass secrets (policy unchanged)", () => {
    const href = `https://${PREVIEW_HOST}/finance/share/example-token`;
    expect(href).not.toContain("x-vercel-protection-bypass");
    expect(href).not.toContain("VERCEL_AUTOMATION_BYPASS");
  });

  it("CASE 7 â FIN-07B-style protected Preview: preflight pass without FIN-06E distribution readiness", () => {
    const result = runDeploymentPreflight(protectedFeaturePreviewEnv());
    expect(result.pass).toBe(true);
  });

  it("explicit PUBLIC_ACTION_BASE_URL without reachability attestation blocks deployment (FIN-06E UAT intent)", () => {
    const env = protectedFeaturePreviewEnv({
      PUBLIC_ACTION_BASE_URL: "https://fin-06e-preview.fcallschwil.ch",
    });
    const result = runDeploymentPreflight(env);

    expect(result.pass).toBe(false);
    expect(
      result.violations.some((v) => v.code === "PREVIEW_PUBLIC_ACTION_NOT_EXTERNALLY_REACHABLE"),
    ).toBe(true);
  });
});
