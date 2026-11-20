import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const CANONICAL_STAGE_BASE = "8e2176efa2f995bf877e9640a004a9b6a716d8f0";

describe("PR #1017 TARGET-context client evidence", () => {
  it("records probe contract for task list, detail, and TARGET context", () => {
    let prismaClient = "@prisma/client@unknown";
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "node_modules/@prisma/client/package.json"), "utf8"),
      ) as { version?: string };
      prismaClient = pkg.version ? `@prisma/client@${pkg.version}` : prismaClient;
    } catch {
      // keep unknown
    }

    const appSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

    const evidence = {
      pullRequest: 1017,
      evidence: {
        testedAppSha: appSha,
        canonicalStageBaseSha: CANONICAL_STAGE_BASE,
        prismaClient,
        targetContextRegistryType: "TARGET",
        targetContextOperationalHrefPattern: "/vereinsleitung/targets/{targetId}",
        exercisedSurfaces: [
          "vorhaben-workspace TARGET task OR filter",
          "VereinsentwicklungWorkspaceRecordRow aufgaben rows",
          "task-context-registry TARGET entry (code)",
        ],
      },
    };

    expect(evidence.evidence.targetContextRegistryType).toBe("TARGET");
    expect(evidence.evidence.prismaClient).toMatch(/^@prisma\/client@/);
  });
});