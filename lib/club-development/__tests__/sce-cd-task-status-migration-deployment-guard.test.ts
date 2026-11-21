/**
 * PR #1018 — WAITING migration deployment guard (byte parity with shared STAGE).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  SCE_CD_TASK_STATUS_MIGRATION_ORDER,
  SCE_CD_TASK_STATUS_WAITING_CHECKSUM_SHA256,
  SCE_CD_TASK_STATUS_WAITING_ENSURE_CHECKSUM_SHA256,
  SCE_CD_TASK_STATUS_WAITING_ENSURE_MIGRATION,
  SCE_CD_TASK_STATUS_WAITING_MIGRATION,
} from "../sce-cd-task-status-migration-handoff";

function migrationSqlBytes(name: string): Buffer {
  return readFileSync(resolve(process.cwd(), `prisma/migrations/${name}/migration.sql`));
}

describe("SCE TaskStatus WAITING migration deployment guard", () => {
  it("keeps recorded STAGE 50000 checksum byte-for-byte", () => {
    const bytes = migrationSqlBytes(SCE_CD_TASK_STATUS_WAITING_MIGRATION);
    const digest = createHash("sha256").update(bytes).digest("hex");
    expect(digest).toBe(SCE_CD_TASK_STATUS_WAITING_CHECKSUM_SHA256);
    const sql = bytes.toString("utf8");
    expect(sql).toContain('ADD VALUE IF NOT EXISTS');
    expect(sql).not.toContain("sce_cd_add_task_status_waiting");
  });

  it("keeps recorded STAGE 50100 ensure checksum byte-for-byte", () => {
    const bytes = migrationSqlBytes(SCE_CD_TASK_STATUS_WAITING_ENSURE_MIGRATION);
    const digest = createHash("sha256").update(bytes).digest("hex");
    expect(digest).toBe(SCE_CD_TASK_STATUS_WAITING_ENSURE_CHECKSUM_SHA256);
    expect(bytes.toString("utf8")).toContain("sce_cd_add_task_status_waiting");
  });

  it("orders ensure after initial append migration", () => {
    expect(SCE_CD_TASK_STATUS_MIGRATION_ORDER).toEqual([
      SCE_CD_TASK_STATUS_WAITING_MIGRATION,
      SCE_CD_TASK_STATUS_WAITING_ENSURE_MIGRATION,
    ]);
  });

  it("provides guarded STAGE and disposable verifier scripts", () => {
    const stageScript = readFileSync(
      resolve(process.cwd(), "scripts/sce-cd-task-status-stage-migration-verify-readonly.ts"),
      "utf8",
    );
    expect(stageScript).toContain("writePerformed: false");
    expect(stageScript).toContain("SCE_DATA_DATABASE_FINGERPRINT");

    const disposableScript = readFileSync(
      resolve(process.cwd(), "scripts/sce-cd-task-status-disposable-migration-verify.ts"),
      "utf8",
    );
    expect(disposableScript).toContain("buildDisposablePrismaMigrateProcessEnv");
  });
});