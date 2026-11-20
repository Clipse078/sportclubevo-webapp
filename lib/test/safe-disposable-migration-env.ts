/**
 * Fail-closed guard for disposable `prisma migrate *` subprocesses.
 *
 * Prisma CLI resolves the datasource from DIRECT_URL before DATABASE_URL
 * (see lib/server/prisma-datasource.ts). A local DATABASE_URL with an
 * inherited STAGE DIRECT_URL still migrates shared STAGE.
 */

import { resolvePrismaDatasourceUrlForCommand } from "@/lib/server/prisma-datasource";
import {
  UnsafeTestDatabaseError,
  assertSafeTestDatabase,
  isKnownSharedOrRuntimeDatabase,
  maskDatabaseUrl,
  normalizeDatabaseUrl,
} from "@/lib/test/safe-test-database";

export class UnsafeDisposableMigrationEnvError extends UnsafeTestDatabaseError {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeDisposableMigrationEnvError";
  }
}

const MIGRATE_DEPLOY_ARGV = ["node", "prisma", "migrate", "deploy"] as const;

const PRISMA_MIGRATION_ENV_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "SHADOW_DATABASE_URL",
] as const;

export type PrismaMigrationEnvKey = (typeof PRISMA_MIGRATION_ENV_KEYS)[number];

export type PrismaMigrationEndpointSnapshot = {
  set: boolean;
  masked: string;
  normalized: string | null;
};

export type PrismaMigrationEndpointReport = Record<
  PrismaMigrationEnvKey | "effectivePrismaDatasource",
  PrismaMigrationEndpointSnapshot
>;

export function collectPrismaMigrationEndpointReport(
  env: NodeJS.ProcessEnv = process.env,
): PrismaMigrationEndpointReport {
  const report = {} as PrismaMigrationEndpointReport;

  for (const key of PRISMA_MIGRATION_ENV_KEYS) {
    const value = env[key]?.trim();
    report[key] = {
      set: Boolean(value),
      masked: maskDatabaseUrl(value),
      normalized: value ? normalizeDatabaseUrl(value) : null,
    };
  }

  const effective =
    resolvePrismaDatasourceUrlForCommand(env, MIGRATE_DEPLOY_ARGV) ?? null;
  report.effectivePrismaDatasource = {
    set: Boolean(effective),
    masked: maskDatabaseUrl(effective ?? undefined),
    normalized: effective ? normalizeDatabaseUrl(effective) : null,
  };

  return report;
}

function assertEndpointMatchesDisposable(
  key: string,
  normalized: string,
  disposableNormalized: string,
  masked: string,
  disposableMasked: string,
): void {
  if (normalized === disposableNormalized) return;

  const shared = isKnownSharedOrRuntimeDatabase(normalized);
  const sharedHint =
    "unsafe" in shared && shared.unsafe ? ` (${shared.reason})` : "";
  throw new UnsafeDisposableMigrationEnvError(
    `Refusing disposable migration: ${key} ${masked} must match disposable target ${disposableMasked}${sharedHint}.`,
  );
}

/**
 * Validates every configured Prisma migration endpoint and the effective CLI datasource.
 */
export function assertSafeDisposablePrismaMigrationEnv(
  disposableUrl?: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const safeDisposable = assertSafeTestDatabase(disposableUrl);
  const disposableNormalized = normalizeDatabaseUrl(safeDisposable);
  const disposableMasked = maskDatabaseUrl(safeDisposable);
  const report = collectPrismaMigrationEndpointReport(env);

  for (const key of PRISMA_MIGRATION_ENV_KEYS) {
    const entry = report[key];
    if (!entry.normalized) continue;
    assertEndpointMatchesDisposable(
      key,
      entry.normalized,
      disposableNormalized,
      entry.masked,
      disposableMasked,
    );
  }

  if (report.effectivePrismaDatasource.normalized) {
    assertEndpointMatchesDisposable(
      "effective Prisma datasource",
      report.effectivePrismaDatasource.normalized,
      disposableNormalized,
      report.effectivePrismaDatasource.masked,
      disposableMasked,
    );
  } else if (!report.DATABASE_URL.normalized && !report.DIRECT_URL.normalized) {
    throw new UnsafeDisposableMigrationEnvError(
      "Refusing disposable migration: no effective Prisma datasource URL is configured.",
    );
  }

  return safeDisposable;
}

/**
 * Environment for a disposable `prisma migrate deploy` child process. Drops inherited
 * STAGE reference vars and pins DATABASE_URL, DIRECT_URL, and SHADOW_DATABASE_URL together.
 */
export function buildDisposablePrismaMigrateProcessEnv(
  baseEnv: NodeJS.ProcessEnv,
  disposableUrl?: string,
): NodeJS.ProcessEnv {
  const safeDisposable = assertSafeTestDatabase(disposableUrl);
  const {
    STAGE_DB_URL: _stageDb,
    STAGE_DIRECT_URL: _stageDirect,
    ...rest
  } = baseEnv;

  const candidate: NodeJS.ProcessEnv = {
    ...rest,
    DATABASE_URL: safeDisposable,
    DIRECT_URL: safeDisposable,
    TEST_DATABASE_URL: safeDisposable,
  };
  delete candidate.SHADOW_DATABASE_URL;

  assertSafeDisposablePrismaMigrationEnv(safeDisposable, candidate);
  return candidate;
}