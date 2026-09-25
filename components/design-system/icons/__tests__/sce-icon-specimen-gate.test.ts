import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isSceIconSpecimenAvailable } from "../sce-icon-specimen-gate";

describe("isSceIconSpecimenAvailable", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", undefined);

    expect(isSceIconSpecimenAvailable()).toBe(true);
  });

  it("allows Vercel preview deployments", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "cursor/sce-icons-01-foundation-d5e6");
    vi.stubEnv("APP_ENV", "stage");

    expect(isSceIconSpecimenAvailable()).toBe(true);
  });

  it("allows STAGE deployments", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "STAGE");

    expect(isSceIconSpecimenAvailable()).toBe(true);
  });

  it("denies real production deployments", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "prod");

    expect(isSceIconSpecimenAvailable()).toBe(false);
  });

  it("does not treat branch-name STAGE alone as sufficient on production metadata", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "prod");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "STAGE");

    expect(isSceIconSpecimenAvailable()).toBe(false);
  });
});

describe("SCE icon specimen route guard wiring", () => {
  it("keeps the authenticated dashboard route behind notFound when unavailable", () => {
    const page = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/dev/sce-icons/page.tsx"),
      "utf8",
    );

    expect(page).toContain("notFound");
    expect(page).toContain("isSceIconSpecimenAvailable");
    expect(page).toContain("SceIconSpecimen");
    expect(page).not.toContain("VERCEL_GIT_COMMIT_REF");
  });
});
