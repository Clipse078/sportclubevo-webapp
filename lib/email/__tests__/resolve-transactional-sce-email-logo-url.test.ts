import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  TRANSACTIONAL_EMAIL_ASSET_CANONICAL_FALLBACK_ORIGIN,
  resolveTransactionalSceEmailLogoAbsoluteUrl,
} from "@/lib/email/resolve-transactional-sce-email-logo-url";
import { SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC } from "@/lib/branding/sportclubevo-platform-wordmark";

const PREVIEW_HOST =
  "sportclubevo-webapp-stage-git-curs-c7ecf7-mds-projects-462da62c.vercel.app";

describe("resolveTransactionalSceEmailLogoAbsoluteUrl", () => {
  it("prefers APP_BASE_URL over vercel NEXTAUTH_URL", () => {
    const url = resolveTransactionalSceEmailLogoAbsoluteUrl({
      NODE_ENV: "production",
      APP_ENV: "stage",
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_URL: PREVIEW_HOST,
      APP_BASE_URL: "https://fcallschwil.sportclubevo.com",
      NEXTAUTH_URL: `https://${PREVIEW_HOST}`,
    });

    expect(url).toBe(
      `https://fcallschwil.sportclubevo.com${SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC}`,
    );
    expect(url).not.toContain("vercel.app");
  });

  it("falls back to STAGE canonical when only NEXTAUTH_URL is a vercel preview host", () => {
    const url = resolveTransactionalSceEmailLogoAbsoluteUrl({
      NODE_ENV: "production",
      APP_ENV: "stage",
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_URL: PREVIEW_HOST,
      NEXTAUTH_URL: `https://${PREVIEW_HOST}`,
    });

    expect(url).toBe(
      `${TRANSACTIONAL_EMAIL_ASSET_CANONICAL_FALLBACK_ORIGIN}${SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC}`,
    );
    expect(url).not.toContain("vercel.app");
  });
});