import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { resolve } from "node:path";
import { assertAcceptanceDatabaseTarget } from "@/lib/acceptance/bootstrap";
import { getRuntimeEnvironment } from "@/lib/env";
import { shouldApplyDatabaseMigrations } from "@/lib/server/database-migration-policy";
import { resolvePrismaCliPath } from "@/lib/server/prisma-cli";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

export type DeployMigrationsDependencies = {
  spawnSync: (
    command: string,
    args: readonly string[],
    options: { stdio: "inherit"; env: NodeJS.ProcessEnv },
  ) => SpawnSyncReturns<Buffer>;
  exit: (code?: number | string | null) => never;
  env: NodeJS.ProcessEnv;
  execPath: string;
  resolvePrismaCliPath: () => string;
};

export function runDeployMigrationsIfEnabled(
  deps: DeployMigrationsDependencies = {
    spawnSync,
    exit: process.exit,
    env: process.env,
    execPath: process.execPath,
    resolvePrismaCliPath,
  },
): void {
  const enabled = shouldApplyDatabaseMigrations(deps.env);

  if (!enabled) {
    console.log(
      '[migrate] Skipped: APPLY_DATABASE_MIGRATIONS is not exactly "true".',
    );
    deps.exit(0);
  }

  const databaseUrl =
    deps.env.DIRECT_URL?.trim() || deps.env.DATABASE_URL?.trim();
  const runtime = getRuntimeEnvironment({
    ...deps.env,
    NODE_ENV: deps.env.NODE_ENV ?? "development",
  });

  if (runtime.isAcceptance && databaseUrl) {
    assertAcceptanceDatabaseTarget(databaseUrl, [
      deps.env.ACCEPTANCE_DATABASE_HOST,
      deps.env.ACCEPTANCE_DIRECT_DATABASE_HOST,
    ]);
  }

  assertOperationalMutationAllowed(
    {
      operationId: "deploy-migrations",
      databaseUrl,
      explicitIntent: enabled,
      allowedRemoteEnvironments: ["acceptance", "stage", "prod"],
      operationSpecificAuthorization: enabled,
    },
    deps.env,
  );

  console.log("[migrate] Authorized; running prisma migrate deploy.");
  const prismaCliPath = deps.resolvePrismaCliPath();
  const result = deps.spawnSync(
    deps.execPath,
    [prismaCliPath, "migrate", "deploy"],
    {
      stdio: "inherit",
      env: deps.env,
    },
  );

  if (result.error) {
    throw result.error;
  }

  const migrateStatus = result.status ?? 1;
  if (migrateStatus !== 0) {
    deps.exit(migrateStatus);
  }

  const postDeployScript = resolve(
    process.cwd(),
    "scripts/post-deploy-tenant-club-admin-reconciliation.ts",
  );
  const tsxCli = resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs");
  console.log("[migrate] Running post-deploy tenant Club Admin reconciliation.");
  const reconcileResult = deps.spawnSync(
    deps.execPath,
    [tsxCli, postDeployScript],
    {
      stdio: "inherit",
      env: deps.env,
    },
  );

  if (reconcileResult.error) {
    throw reconcileResult.error;
  }

  deps.exit(reconcileResult.status ?? 1);
}
