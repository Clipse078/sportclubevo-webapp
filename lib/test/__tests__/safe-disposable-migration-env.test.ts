import { afterEach, describe, expect, it } from "vitest";
import {
  UnsafeDisposableMigrationEnvError,
  assertSafeDisposablePrismaMigrationEnv,
  buildDisposablePrismaMigrateProcessEnv,
  collectPrismaMigrationEndpointReport,
} from "../safe-disposable-migration-env";
import { normalizeDatabaseUrl } from "../safe-test-database";

const LOCAL =
  "postgresql://postgres:postgres@127.0.0.1:5432/sce_cd_connected_migration_test";
const STAGE_SHAPED =
  "postgresql://stage:secret@ep-wispy-hall-aso93dy6.eu-central-1.aws.neon.tech/neondb";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("safe-disposable-migration-env", () => {
  it("reports effective datasource from inherited STAGE DIRECT_URL", () => {
    process.env.TEST_DATABASE_URL = LOCAL;
    process.env.DATABASE_URL = LOCAL;
    process.env.DIRECT_URL = STAGE_SHAPED;

    const report = collectPrismaMigrationEndpointReport(process.env);
    expect(report.DIRECT_URL.masked).toContain("ep-wispy-hall");
    expect(report.effectivePrismaDatasource.normalized).toBe(
      normalizeDatabaseUrl(STAGE_SHAPED),
    );
  });

  it("fails closed when DIRECT_URL is inherited STAGE while DATABASE_URL is local", () => {
    process.env.TEST_DATABASE_URL = LOCAL;
    process.env.DATABASE_URL = LOCAL;
    process.env.DIRECT_URL = STAGE_SHAPED;
    process.env.STAGE_DIRECT_URL = STAGE_SHAPED;

    expect(() => assertSafeDisposablePrismaMigrationEnv()).toThrow(
      UnsafeDisposableMigrationEnvError,
    );
    expect(() => assertSafeDisposablePrismaMigrationEnv()).toThrow(/DIRECT_URL/);
  });

  it("fails when SHADOW_DATABASE_URL points at shared runtime", () => {
    process.env.TEST_DATABASE_URL = LOCAL;
    process.env.DATABASE_URL = LOCAL;
    process.env.DIRECT_URL = LOCAL;
    process.env.SHADOW_DATABASE_URL = STAGE_SHAPED;

    expect(() => assertSafeDisposablePrismaMigrationEnv()).toThrow(
      /SHADOW_DATABASE_URL/,
    );
  });

  it("builds a child env that pins every migration endpoint to the disposable URL", () => {
    process.env.TEST_DATABASE_URL = LOCAL;
    process.env.DATABASE_URL = STAGE_SHAPED;
    process.env.DIRECT_URL = STAGE_SHAPED;
    process.env.STAGE_DIRECT_URL = STAGE_SHAPED;
    process.env.STAGE_DB_URL = STAGE_SHAPED;

    const child = buildDisposablePrismaMigrateProcessEnv(process.env);
    expect(child.STAGE_DB_URL).toBeUndefined();
    expect(child.STAGE_DIRECT_URL).toBeUndefined();
    expect(child.DATABASE_URL).toBe(LOCAL);
    expect(child.DIRECT_URL).toBe(LOCAL);
    expect(child.SHADOW_DATABASE_URL).toBeUndefined();
    expect(() => assertSafeDisposablePrismaMigrationEnv(undefined, child)).not.toThrow();
  });

  it("does not connect to STAGE when validating inherited DIRECT_URL mismatch", () => {
    process.env.TEST_DATABASE_URL = LOCAL;
    process.env.DATABASE_URL = LOCAL;
    process.env.DIRECT_URL = STAGE_SHAPED;

    expect(() => assertSafeDisposablePrismaMigrationEnv()).toThrow(
      UnsafeDisposableMigrationEnvError,
    );
  });
});