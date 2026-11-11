import { describe, expect, it } from "vitest";
import { SCE_DS2_07G_VERIFICATION_DATABASE_NAME } from "@/lib/design-system/sce-ds2-07g-verification-fixture-constants";
import {
  assertSafeVerificationDatabase,
  UnsafeVerificationDatabaseError,
} from "@/lib/test/safe-verification-database";

describe("safe-verification-database", () => {
  const baseEnv = { ...process.env };

  it("accepts local DATABASE_URL_VERIFICATION with the verification database name", () => {
    const url = `postgresql://postgres:postgres@127.0.0.1:5432/${SCE_DS2_07G_VERIFICATION_DATABASE_NAME}`;
    const prevDatabase = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/fc_allschwil";
    process.env.DATABASE_URL_VERIFICATION = url;
    try {
      expect(assertSafeVerificationDatabase()).toBe(url);
    } finally {
      process.env.DATABASE_URL = prevDatabase;
      delete process.env.DATABASE_URL_VERIFICATION;
    }
  });

  it("rejects verification URL pointing at the wrong database name", () => {
    const url = "postgresql://postgres:postgres@127.0.0.1:5432/wrong_db";
    process.env.DATABASE_URL_VERIFICATION = url;
    try {
      expect(() => assertSafeVerificationDatabase()).toThrow(UnsafeVerificationDatabaseError);
    } finally {
      delete process.env.DATABASE_URL_VERIFICATION;
      Object.assign(process.env, baseEnv);
    }
  });
});
