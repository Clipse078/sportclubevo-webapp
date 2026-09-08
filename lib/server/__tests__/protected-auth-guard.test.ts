import { describe, expect, it } from "vitest";
import {
  evaluateProtectedAuthGuard,
  getProtectedAuthIdentities,
} from "../protected-auth-guard";

const LOCAL_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "development",
  APP_ENV: "local",
};

const STAGE_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production",
  APP_ENV: "stage",
};

const PREVIEW_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "preview",
};

describe("getProtectedAuthIdentities", () => {
  it("always includes the platform protected identity", () => {
    const identities = getProtectedAuthIdentities({ NODE_ENV: "test" });
    expect(identities.has("it@fcallschwil.ch")).toBe(true);
  });

  it("includes additional identities from PROTECTED_AUTH_IDENTITIES env var", () => {
    const identities = getProtectedAuthIdentities({
      NODE_ENV: "test",
      PROTECTED_AUTH_IDENTITIES: "admin@example.com, ops@example.com",
    });
    expect(identities.has("admin@example.com")).toBe(true);
    expect(identities.has("ops@example.com")).toBe(true);
    expect(identities.has("it@fcallschwil.ch")).toBe(true);
  });

  it("normalises identities to lowercase", () => {
    const identities = getProtectedAuthIdentities({
      NODE_ENV: "test",
      PROTECTED_AUTH_IDENTITIES: "Admin@EXAMPLE.COM",
    });
    expect(identities.has("admin@example.com")).toBe(true);
  });
});

describe("evaluateProtectedAuthGuard", () => {
  describe("non-protected accounts", () => {
    it("allows any operation on an account that is not protected", () => {
      const result = evaluateProtectedAuthGuard(
        "regular-user@example.com",
        { isCreate: false },
        LOCAL_ENV,
      );
      expect(result.allowed).toBe(true);
    });

    it("allows creating a new non-protected account", () => {
      const result = evaluateProtectedAuthGuard(
        "newuser@example.com",
        { isCreate: true },
        STAGE_ENV,
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("protected account — automated seed/bootstrap paths", () => {
    it("blocks passwordHash UPDATE for protected account without override", () => {
      const result = evaluateProtectedAuthGuard(
        "it@fcallschwil.ch",
        { isCreate: false },
        LOCAL_ENV,
      );
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContain("it@fcallschwil.ch");
        expect(result.reason).toContain("blocked");
      }
    });

    it("blocks passwordHash UPDATE for protected account in STAGE without override", () => {
      const result = evaluateProtectedAuthGuard(
        "it@fcallschwil.ch",
        { isCreate: false },
        STAGE_ENV,
      );
      expect(result.allowed).toBe(false);
    });

    it("blocks passwordHash UPDATE for protected account in Preview without override", () => {
      const result = evaluateProtectedAuthGuard(
        "it@fcallschwil.ch",
        { isCreate: false },
        PREVIEW_ENV,
      );
      expect(result.allowed).toBe(false);
    });

    it("allows a genuine initial CREATE of the protected account in STAGE", () => {
      const result = evaluateProtectedAuthGuard(
        "it@fcallschwil.ch",
        { isCreate: true },
        STAGE_ENV,
      );
      expect(result.allowed).toBe(true);
    });

    it("allows CREATE of protected account in local environment", () => {
      const result = evaluateProtectedAuthGuard(
        "it@fcallschwil.ch",
        { isCreate: true },
        LOCAL_ENV,
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("automated environments cannot bypass protected updates", () => {
    it("blocks UPDATE even when an inherited override-like env variable is present", () => {
      const result = evaluateProtectedAuthGuard(
        "it@fcallschwil.ch",
        { isCreate: false },
        { ...STAGE_ENV, ALLOW_PASSWORD_CHANGE: "true" },
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe("case-insensitive matching", () => {
    it("protects account regardless of email casing in input", () => {
      const result = evaluateProtectedAuthGuard(
        "IT@FCALLSCHWIL.CH",
        { isCreate: false },
        STAGE_ENV,
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe("ordinary deployment path cannot invoke credential reset", () => {
    it("automated path (isCreate=false) is blocked for protected identity", () => {
      const result = evaluateProtectedAuthGuard(
        "it@fcallschwil.ch",
        { isCreate: false },
        STAGE_ENV,
      );
      expect(result.allowed).toBe(false);
    });
  });
});
