import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  evaluatePublicActionTarget,
  requirePublicActionTargetForFinanceDistribution,
} from "../public-action-target";
import { FINANCE_06E_PUBLIC_ACTION_TARGET_INVARIANT } from "../finance-publication-share-database-contract";
import { FinanceDomainError } from "@/lib/finance/errors";

const CANONICAL = "https://fcallschwil.sportclubevo.com";
const PREVIEW_HOST = "sportclubevo-webapp-stage-git-feature.vercel.app";

function previewEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    APP_ENV: "stage",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    APP_BASE_URL: CANONICAL,
    VERCEL_URL: PREVIEW_HOST,
    ...overrides,
  };
}

function stageProductionEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    APP_ENV: "stage",
    VERCEL: "1",
    VERCEL_ENV: "production",
    APP_BASE_URL: CANONICAL,
    ...overrides,
  };
}

describe("FIN-06E public action target contract", () => {
  it("documents the R7 invariant", () => {
    expect(FINANCE_06E_PUBLIC_ACTION_TARGET_INVARIANT).toBe(
      "RUNTIME_COMPATIBLE_AND_EXTERNALLY_REACHABLE_AND_CAPABILITY_SECURED",
    );
  });

  it("STAGE production canonical host is runtime-compatible and externally reachable", () => {
    const evaluation = evaluatePublicActionTarget(stageProductionEnv());
    expect(evaluation.valid).toBe(true);
    expect(evaluation.origin).toBe(CANONICAL);
    expect(evaluation.runtimeCompatible).toBe(true);
    expect(evaluation.externallyReachable).toBe(true);
  });

  it("Preview VERCEL_URL is runtime-compatible but not externally reachable by default", () => {
    const evaluation = evaluatePublicActionTarget(previewEnv());
    expect(evaluation.origin).toBe(`https://${PREVIEW_HOST}`);
    expect(evaluation.runtimeCompatible).toBe(true);
    expect(evaluation.externallyReachable).toBe(false);
    expect(evaluation.valid).toBe(false);
    expect(evaluation.failureCode).toBe("DEPLOYMENT_PROTECTION");
  });

  it("Preview attestation allows protected hostname when operator confirms reachability", () => {
    const evaluation = evaluatePublicActionTarget(
      previewEnv({ PUBLIC_ACTION_EXTERNALLY_REACHABLE: "confirmed" }),
    );
    expect(evaluation.valid).toBe(true);
    expect(evaluation.externallyReachable).toBe(true);
  });

  it("Preview custom PUBLIC_ACTION_BASE_URL requires external reachability attestation", () => {
    const custom = "https://fin-06e-preview.fcallschwil.ch";
    const withoutAttestation = evaluatePublicActionTarget(
      previewEnv({ PUBLIC_ACTION_BASE_URL: custom }),
    );
    expect(withoutAttestation.origin).toBe(custom);
    expect(withoutAttestation.runtimeCompatible).toBe(true);
    expect(withoutAttestation.valid).toBe(false);

    const withAttestation = evaluatePublicActionTarget(
      previewEnv({
        PUBLIC_ACTION_BASE_URL: custom,
        PUBLIC_ACTION_EXTERNALLY_REACHABLE: "true",
      }),
    );
    expect(withAttestation.valid).toBe(true);
  });

  it("blocks distribution when Preview recipient target is not externally reachable", () => {
    expect(() => requirePublicActionTargetForFinanceDistribution(previewEnv())).toThrow(
      FinanceDomainError,
    );
    expect(() => requirePublicActionTargetForFinanceDistribution(previewEnv())).toThrow(
      /Deployment Protection/i,
    );
  });
});
