import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function extractPermissionModuleEnumValues(schemaSource: string): Set<string> {
  const match = schemaSource.match(/enum PermissionModule \{([\s\S]*?)\n\}/);
  if (!match) {
    throw new Error("PermissionModule enum not found in prisma/schema.prisma");
  }
  const values = match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"));
  return new Set(values);
}

describe("SCE-ACTIVITY-CREATE — migration integrity guardrails", () => {
  const permissionModules = extractPermissionModuleEnumValues(read("prisma/schema.prisma"));

  const activityCreateMigrationsWithPermissionSeed = [
    "prisma/migrations/20261013143000_sce_activity_create_01c_club_event/migration.sql",
    "prisma/migrations/20261013180000_sce_activity_create_01d_training/migration.sql",
    "prisma/migrations/20261014120000_sce_activity_create_01e_match/migration.sql",
    "prisma/migrations/20261014130000_sce_activity_create_01f_tournament/migration.sql",
  ] as const;

  it("01D seeds activities.training.approve under PermissionModule TRAININGS (not TRAINING)", () => {
    const sql = read("prisma/migrations/20261013180000_sce_activity_create_01d_training/migration.sql");
    expect(sql).toContain("'activities.training.approve'");
    expect(sql).toMatch(
      /'activities\.training\.approve', 'Training — approve \/ reject submissions', 'TRAININGS', 'TENANT'/,
    );
  });

  it("activity-create permission seeds reference valid PermissionModule enum values", () => {
    for (const migrationPath of activityCreateMigrationsWithPermissionSeed) {
      const sql = read(migrationPath);
      const inserts = [...sql.matchAll(/INSERT INTO "Permission"[\s\S]*?VALUES\s*\([\s\S]*?\)/g)];
      expect(inserts.length, migrationPath).toBeGreaterThan(0);
      for (const block of inserts) {
        const moduleMatch = block[0].match(/,\s*'([A-Z_]+)',\s*'TENANT'/);
        if (moduleMatch) {
          expect(permissionModules.has(moduleMatch[1]), migrationPath).toBe(true);
        }
      }
    }
  });

  it("composer draft tables are introduced by committed 01C–01F migrations", () => {
    expect(read("prisma/migrations/20261013143000_sce_activity_create_01c_club_event/migration.sql")).toContain(
      "ClubEventComposerDraft",
    );
    expect(read("prisma/migrations/20261013180000_sce_activity_create_01d_training/migration.sql")).toContain(
      "TrainingComposerDraft",
    );
    expect(read("prisma/migrations/20261014120000_sce_activity_create_01e_match/migration.sql")).toContain(
      "MatchComposerDraft",
    );
    expect(read("prisma/migrations/20261014130000_sce_activity_create_01f_tournament/migration.sql")).toContain(
      "TournamentComposerDraft",
    );
  });
});
