/**
 * PR #1025 — browser leg of disposable release gate (separate process to limit OOM).
 *
 * Required env: TEST_DATABASE_URL, AUTH_SECRET or NEXTAUTH_SECRET
 */
import "dotenv/config";
import { execSync } from "node:child_process";

function killListenersOnPorts(ports: number[]): void {
  for (const port of ports) {
    try {
      const out = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
      for (const pid of out.split("\n").filter(Boolean)) {
        try {
          process.kill(Number(pid), "SIGKILL");
        } catch {
          //
        }
      }
    } catch {
      //
    }
  }
}

async function main(): Promise<void> {
  const testDb = process.env.TEST_DATABASE_URL?.trim();
  if (!testDb) {
    throw new Error("TEST_DATABASE_URL required");
  }
  const authSecret =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!authSecret) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET required");
  }

  const editPort = process.env.TENANT_DOC_EDIT_BROWSER_PORT?.trim() || "3191";
  const lifePort = process.env.TENANT_DOC_LIFECYCLE_BROWSER_PORT?.trim() || "3190";
  killListenersOnPorts([Number(editPort), Number(lifePort)]);

  const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    TEST_DATABASE_URL: testDb,
    DATABASE_URL: testDb,
    DIRECT_URL: testDb,
    AUTH_SECRET: authSecret,
    NEXTAUTH_SECRET: authSecret,
    SCE_DATA_ENVIRONMENT: "LOCAL",
    TENANT_DOC_BROWSER_SKIP_BUILD: process.env.TENANT_DOC_BROWSER_SKIP_BUILD ?? "1",
    TENANT_DOC_BROWSER_SKIP_MIGRATE: "1",
    NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=6144",
  };

  if (baseEnv.TENANT_DOC_BROWSER_SKIP_BUILD !== "1") {
    execSync("npm run build", { stdio: "inherit", env: baseEnv });
  }

  const editEnv = {
    ...baseEnv,
    TENANT_DOC_BROWSER_PORT: editPort,
    NEXTAUTH_URL: `http://127.0.0.1:${editPort}`,
    AUTH_URL: `http://127.0.0.1:${editPort}`,
  };
  execSync("npm run tenant-documentation:edit-browser-regression", {
    stdio: "inherit",
    env: editEnv,
  });

  killListenersOnPorts([Number(editPort)]);

  const lifeEnv = {
    ...baseEnv,
    TENANT_DOC_BROWSER_PORT: lifePort,
    NEXTAUTH_URL: `http://127.0.0.1:${lifePort}`,
    AUTH_URL: `http://127.0.0.1:${lifePort}`,
  };
  execSync("npm run tenant-documentation:lifecycle-browser-regression", {
    stdio: "inherit",
    env: lifeEnv,
  });

  console.log(JSON.stringify({ status: "PASS", browserGate: true }));
}

main().catch((error) => {
  console.error("[sce-tenant-documentation-disposable-browser-gate] FAILED:", error);
  process.exit(1);
});