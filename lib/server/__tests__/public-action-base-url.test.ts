import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildPublicActionAbsoluteHref,
  publicActionBaseWouldCrossIncompatibleDeployment,
  resolvePublicActionBaseUrl,
} from "../public-action-base-url";

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

describe("resolvePublicActionBaseUrl", () => {
  it("uses canonical APP_BASE_URL on STAGE production", () => {
    const base = resolvePublicActionBaseUrl(stageProductionEnv());
    expect(base.origin).toBe(CANONICAL);
  });

  it("uses VERCEL_URL on Preview when canonical tenant host differs", () => {
    const base = resolvePublicActionBaseUrl(previewEnv());
    expect(base.origin).toBe(`https://${PREVIEW_HOST}`);
  });

  it("prefers PUBLIC_ACTION_BASE_URL when explicitly configured", () => {
    const base = resolvePublicActionBaseUrl(
      previewEnv({ PUBLIC_ACTION_BASE_URL: "https://preview-public.example.test" }),
    );
    expect(base.origin).toBe("https://preview-public.example.test");
  });

  it("builds view and PDF links on the same compatible origin", () => {
    const env = previewEnv();
    const view = buildPublicActionAbsoluteHref(
      "/share/finance/publication/token-abc",
      env,
    );
    const pdf = buildPublicActionAbsoluteHref(
      "/api/share/finance/publication/token-abc/pdf",
      env,
    );
    expect(view).toBe(
      `https://${PREVIEW_HOST}/share/finance/publication/token-abc`,
    );
    expect(pdf).toBe(
      `https://${PREVIEW_HOST}/api/share/finance/publication/token-abc/pdf`,
    );
    expect(new URL(view).origin).toBe(new URL(pdf).origin);
  });
});

describe("publicActionBaseWouldCrossIncompatibleDeployment", () => {
  it("detects Preview canonical-host mismatch", () => {
    expect(publicActionBaseWouldCrossIncompatibleDeployment(previewEnv())).toBe(true);
  });

  it("is false for STAGE production serving the tenant domain", () => {
    expect(publicActionBaseWouldCrossIncompatibleDeployment(stageProductionEnv())).toBe(
      false,
    );
  });

  it("is true for Preview with tenant canonical APP_BASE_URL but no VERCEL_URL", () => {
    expect(
      publicActionBaseWouldCrossIncompatibleDeployment(
        previewEnv({ VERCEL_URL: undefined }),
      ),
    ).toBe(true);
  });
});
