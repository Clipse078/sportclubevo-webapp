/**
 * SCE-DS2-07B — route lifecycle governance.
 * Proves discovery, package ownership, and the negative cases that must fail CI.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCE_DS2_06_ROUTE_INVENTORY } from "@/lib/design-system/sce-ds2-06-route-inventory";
import { SCE_DS2_06_MANDATORY_ROUTES } from "@/lib/design-system/sce-ds2-06-meta";
import {
  SCE_DS2_07B_EXCEPTION_IDS,
  SCE_DS2_07B_MIGRATION_PACKAGES,
  SCE_DS2_07B_PACKAGE_KEY,
} from "@/lib/design-system/sce-ds2-07b-meta";
import {
  SCE_DS2_07B_ROUTE_REGISTRY,
  SCE_DS2_07B_SUMMARY,
} from "@/lib/design-system/sce-ds2-07b-route-registry";
import { SCE_DS2_07A_REDIRECT_ALIASES, SCE_DS2_07A_ROUTE_DISCOVERY_BASELINE } from "@/lib/design-system/sce-ds2-07a-meta";
import {
  buildRegistry,
  discoverAppRouter,
  evaluateGovernance,
  evaluateRepository,
  evidenceAcceptable,
  EXCEPTION_IDS,
  isVerifiedAuthenticatedVisual,
  MIGRATION_PACKAGES,
  type GovernanceOverlay,
  type RegistryEntry,
} from "../../../scripts/lib/sce-ds2-07b-route-governance.mjs";

const ROOT = process.cwd();
const FIXTURES = join(ROOT, "lib/design-system/__tests__/fixtures/sce-ds2-07b");

const PROOF = {
  visual: "vitest lib/design-system/__tests__/sce-ds2-07b-route-lifecycle-governance.test.ts viewport review",
  accessibility:
    "vitest lib/design-system/__tests__/sce-ds2-07b-route-lifecycle-governance.test.ts keyboard axe",
  functional:
    "vitest lib/design-system/__tests__/sce-ds2-07b-route-lifecycle-governance.test.ts covers the governed page",
  responsive:
    "vitest lib/design-system/__tests__/sce-ds2-07b-route-lifecycle-governance.test.ts viewport 375 768 1280",
};

function codes(blocking: { code: string }[]) {
  return blocking.map((item) => item.code);
}

function govern(fixture: string, baseline: string[] = [], overlay?: GovernanceOverlay) {
  const discovery = discoverAppRouter(join(FIXTURES, fixture));
  const registry = buildRegistry({ discovery, baselineSourceFiles: baseline, overlay });
  const evaluation = evaluateGovernance({
    discovery,
    registry,
    baselineSourceFiles: baseline,
    lifecycle: overlay?.lifecycle ?? [],
    overlay,
  });
  return { discovery, registry, evaluation };
}

describe("SCE-DS2-07B route lifecycle governance", () => {
  it("reconciles the committed registry with discovery and keeps existing debt non-blocking", () => {
    const result = evaluateRepository(ROOT);
    expect(result.drift).toEqual([]);
    expect(result.evaluation.blocking).toEqual([]);
    expect(result.evaluation.tracked.length).toBeGreaterThan(0);
    expect(result.summary.blockingCount).toBe(0);
    expect(result.summary.unassignedCount).toBe(0);
    expect(result.summary.introducedAfterBaselineCount).toBe(0);
    expect(result.summary.verifiedAuthenticatedVisualCount).toBe(0);
    expect(result.summary.verifiedAuthenticatedVisualPercent).toBe(0);
    expect(result.summary.architecturalCanonicalCount).toBeGreaterThan(0);
    expect(result.summary.architecturalCanonicalPercent).not.toBe(
      result.summary.verifiedAuthenticatedVisualPercent,
    );
    expect(SCE_DS2_07B_SUMMARY).toEqual(result.summary);
  });

  it("accounts for every authenticated page, public page, redirect, handler, and framework file", () => {
    expect(SCE_DS2_06_ROUTE_INVENTORY).toHaveLength(SCE_DS2_07A_ROUTE_DISCOVERY_BASELINE);
    const adminPages = SCE_DS2_07B_ROUTE_REGISTRY.filter((entry) =>
      entry.sourceFile.startsWith("app/(admin)/"),
    );
    expect(adminPages).toHaveLength(SCE_DS2_07A_ROUTE_DISCOVERY_BASELINE);
    expect(new Set(SCE_DS2_07B_ROUTE_REGISTRY.map((entry) => entry.sourceFile)).size).toBe(
      SCE_DS2_07B_ROUTE_REGISTRY.length,
    );

    const bySource = new Map(SCE_DS2_07B_ROUTE_REGISTRY.map((entry) => [entry.sourceFile, entry]));
    for (const route of SCE_DS2_06_MANDATORY_ROUTES) {
      expect(SCE_DS2_07B_ROUTE_REGISTRY.some((entry) => entry.urlPattern === route)).toBe(true);
    }

    for (const row of SCE_DS2_06_ROUTE_INVENTORY) {
      const entry = bySource.get(row.source);
      expect(entry, row.source).toBeDefined();
      if (row.action.startsWith("redirect alias")) {
        expect(entry?.routeKind).toBe("REDIRECT_ALIAS");
        expect(entry?.architecture).toBe("NOT_APPLICABLE");
        expect(entry?.migrationStatus).toBe("EXCEPTION");
        expect(entry?.visualVerificationStatus).toBe("NOT_APPLICABLE");
        expect(row.action).toContain(entry?.redirectDestination ?? "");
        expect(isVerifiedAuthenticatedVisual(entry)).toBe(false);
      } else if (row.pageArchitecture === "canonical") {
        expect(entry?.architecture).toBe("CANONICAL");
        expect(entry?.migrationStatus).toBe("IMPLEMENTED");
        expect(entry?.migrationPackage).toBe("DS2-07G");
        expect(entry?.visualVerificationStatus).toBe("PENDING");
      } else if (row.pageArchitecture === "partial") {
        expect(entry?.architecture).toBe("PARTIAL");
        expect(entry?.migrationStatus).toBe("NOT_STARTED");
        expect(["DS2-07C", "DS2-07D", "DS2-07E", "DS2-07F"]).toContain(entry?.migrationPackage);
      } else {
        expect(entry?.architecture).toBe("LEGACY");
        expect(entry?.migrationStatus).toBe("NOT_STARTED");
        expect(["DS2-07C", "DS2-07D", "DS2-07E", "DS2-07F"]).toContain(entry?.migrationPackage);
      }
    }

    for (const alias of SCE_DS2_07A_REDIRECT_ALIASES) {
      const entry = SCE_DS2_07B_ROUTE_REGISTRY.find((item) => item.urlPattern === alias.route);
      expect(entry?.redirectDestination).toBe(alias.destination);
      expect(entry?.migrationStatus).not.toBe("VERIFIED");
    }

    const outsideAdmin = SCE_DS2_07B_ROUTE_REGISTRY.filter(
      (entry) => entry.authenticationScope === "AUTHENTICATED" && !entry.sourceFile.startsWith("app/(admin)/"),
    );
    expect(outsideAdmin.length).toBeGreaterThan(0);
    for (const entry of outsideAdmin) {
      expect(entry.sourceFile.startsWith("app/(print)/")).toBe(true);
      expect(entry.exceptionId).toBe(SCE_DS2_07B_EXCEPTION_IDS.PRINT);
    }

    expect(SCE_DS2_07B_SUMMARY.publicRenderableCount).toBeGreaterThan(0);
    expect(SCE_DS2_07B_SUMMARY.authenticatedRedirectCount).toBeGreaterThanOrEqual(
      SCE_DS2_07A_REDIRECT_ALIASES.length,
    );
    expect(SCE_DS2_07B_SUMMARY.routeHandlerCount).toBeGreaterThan(500);
    expect(SCE_DS2_07B_SUMMARY.frameworkFileCount).toBeGreaterThan(0);
    expect(SCE_DS2_07B_SUMMARY.authenticatedVisualCount).toBe(
      SCE_DS2_07B_SUMMARY.architecture.CANONICAL +
        SCE_DS2_07B_SUMMARY.architecture.PARTIAL +
        SCE_DS2_07B_SUMMARY.architecture.LEGACY,
    );
    expect(
      SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07C"] +
        SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07D"] +
        SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07E"] +
        SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07F"] +
        SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07G"],
    ).toBe(SCE_DS2_07B_SUMMARY.authenticatedVisualCount);

    const report = readFileSync(
      join(ROOT, "docs/design-system-v2/21-ds2-07b-route-lifecycle-governance.md"),
      "utf8",
    );
    expect(report).toContain(SCE_DS2_07B_PACKAGE_KEY);
    expect(report).toContain(
      `Verified authenticated visual pages: **${SCE_DS2_07B_SUMMARY.verifiedAuthenticatedVisualCount} / ${SCE_DS2_07B_SUMMARY.authenticatedVisualCount} (0%)**`,
    );
    expect(report).toContain("Authenticated browser coverage for this package: **none**.");
    expect(report).toContain("| VERIFIED | 0 |");
  });

  it("keeps generated artifacts stable and does not adopt new pages into the baseline", () => {
    const paths = [
      "lib/design-system/sce-ds2-06-route-inventory.ts",
      "lib/design-system/sce-ds2-07b-route-registry.ts",
      "lib/design-system/sce-ds2-07b-route-baseline.json",
      "lib/design-system/sce-ds2-07b-non-page-index.json",
      "docs/design-system-v2/21-ds2-07b-route-lifecycle-governance.md",
    ];
    const before = paths.map((path) => readFileSync(join(ROOT, path), "utf8"));
    execSync("node scripts/sce-ds2-06-route-inventory-scan.mjs", { cwd: ROOT, stdio: "pipe" });
    const after = paths.map((path) => readFileSync(join(ROOT, path), "utf8"));
    expect(after).toEqual(before);
  });

  it("fails when a new authenticated page is unregistered", () => {
    const discovery = discoverAppRouter(join(FIXTURES, "ungoverned-page"));
    expect(discovery.pages).toHaveLength(1);
    const evaluation = evaluateGovernance({
      discovery,
      registry: [],
      baselineSourceFiles: [],
      lifecycle: [],
    });
    expect(codes(evaluation.blocking)).toContain("DS2-07B-UNREGISTERED");
  });

  it("fails when a new authenticated page bypasses canonical architecture", () => {
    const { evaluation } = govern("ungoverned-page");
    const found = codes(evaluation.blocking);
    expect(found).toContain("DS2-07B-NONCANONICAL");
    expect(found).toContain("DS2-07B-TOKENS");
    expect(found).toContain("DS2-07B-TYPOGRAPHY");
    expect(found).toContain("DS2-07B-NEW-PAGE-EVIDENCE");
  });

  it("fails when a route is removed without lifecycle reconciliation", () => {
    const removed = "app/(admin)/dashboard/removed/page.tsx";
    const kept = "app/(admin)/dashboard/ungoverned/page.tsx";
    const { evaluation } = govern("ungoverned-page", [removed, kept]);
    expect(codes(evaluation.blocking)).toEqual(["DS2-07B-LIFECYCLE"]);
    expect(evaluation.tracked.map((item) => item.sourceFile)).toEqual([kept]);
  });

  it("accepts a documented deletion and a rename of existing legacy debt", () => {
    const removed = "app/(admin)/dashboard/removed/page.tsx";
    const kept = "app/(admin)/dashboard/ungoverned/page.tsx";
    const deleted = govern("ungoverned-page", [removed, kept], {
      lifecycle: [
        {
          sourceFile: removed,
          change: "DELETED",
          rationale: "Removed retired route after its destination replaced it.",
        },
      ],
    });
    expect(deleted.evaluation.blocking).toEqual([]);

    const previous = "app/(admin)/dashboard/before/page.tsx";
    const next = "app/(admin)/dashboard/after/page.tsx";
    const renamed = govern("renamed-page", [previous], {
      lifecycle: [
        {
          sourceFile: previous,
          change: "RENAMED",
          destinationSource: next,
          rationale: "Renamed the legacy workspace route without a visual migration.",
        },
      ],
    });
    expect(renamed.evaluation.blocking).toEqual([]);
    expect(renamed.registry[0]?.introducedAfterBaseline).toBe(false);
    expect(renamed.registry[0]?.architecture).toBe("LEGACY");
    expect(renamed.evaluation.tracked).toHaveLength(1);

    const missingLifecycle = govern("renamed-page", [previous]);
    expect(codes(missingLifecycle.evaluation.blocking)).toContain("DS2-07B-LIFECYCLE");
    expect(codes(missingLifecycle.evaluation.blocking)).toContain("DS2-07B-NONCANONICAL");
  });

  it("fails when a redirect alias is falsely counted as visually verified", () => {
    const sourceFile = "app/(admin)/dashboard/alias/page.tsx";
    const discovery = discoverAppRouter(join(FIXTURES, "redirect-alias"));
    const registry = buildRegistry({
      discovery,
      baselineSourceFiles: [sourceFile],
      overlay: {
        recordOverrides: {
          [sourceFile]: {
            migrationStatus: "VERIFIED",
            visualVerificationStatus: "VERIFIED",
            architecture: "CANONICAL",
          },
        },
      },
    });
    expect(registry[0]?.routeKind).toBe("REDIRECT_ALIAS");
    expect(registry[0]?.redirectDestination).toBe("/dashboard/finance/reports");
    const evaluation = evaluateGovernance({
      discovery,
      registry,
      baselineSourceFiles: [sourceFile],
    });
    expect(codes(evaluation.blocking)).toContain("DS2-07B-REDIRECT-VERIFIED");
    expect(registry.filter((entry) => isVerifiedAuthenticatedVisual(entry))).toHaveLength(0);

    const freshAlias = govern("redirect-alias");
    expect(freshAlias.evaluation.blocking).toEqual([]);
    expect(freshAlias.registry[0]?.exceptionId).toBe(EXCEPTION_IDS.REDIRECT);
    expect(freshAlias.registry[0]?.migrationStatus).toBe("EXCEPTION");
  });

  it("fails when a page is marked VERIFIED without required evidence", () => {
    const sourceFile = "app/(admin)/dashboard/governed/page.tsx";
    expect(evidenceAcceptable("imports SceWorkspaceChrome")).toBe(false);
    expect(evidenceAcceptable("production build passed")).toBe(false);
    const discovery = discoverAppRouter(join(FIXTURES, "canonical-page"));
    const registry = buildRegistry({
      discovery,
      baselineSourceFiles: [sourceFile],
      overlay: {
        recordOverrides: {
          [sourceFile]: {
            migrationStatus: "VERIFIED",
            visualVerificationStatus: "VERIFIED",
            accessibilityVerificationStatus: "VERIFIED",
            functionalVerificationStatus: "VERIFIED",
            verificationEvidence: {
              visual: "imports SceWorkspaceChrome",
              accessibility: "imports SceWorkspaceChrome",
              functional: "production build passed",
              responsive: "production build passed",
            },
          },
        },
      },
    });
    const evaluation = evaluateGovernance({
      discovery,
      registry,
      baselineSourceFiles: [sourceFile],
    });
    expect(codes(evaluation.blocking)).toContain("DS2-07B-VERIFIED-WITHOUT-EVIDENCE");
    expect(isVerifiedAuthenticatedVisual(registry[0])).toBe(false);
  });

  it("accepts a new authenticated page that is canonical and carries verification evidence", () => {
    const sourceFile = "app/(admin)/dashboard/governed/page.tsx";
    const { evaluation, registry } = govern("canonical-page", [], {
      recordOverrides: {
        [sourceFile]: {
          migrationStatus: "VERIFIED",
          visualVerificationStatus: "VERIFIED",
          accessibilityVerificationStatus: "VERIFIED",
          functionalVerificationStatus: "VERIFIED",
          verificationEvidence: PROOF,
        },
      },
    });
    expect(evaluation.blocking).toEqual([]);
    expect(isVerifiedAuthenticatedVisual(registry[0])).toBe(true);
    expect(registry[0]?.introducedAfterBaseline).toBe(true);
  });

  it("publishes the same package and exception ids as the governance engine", () => {
    expect([...SCE_DS2_07B_MIGRATION_PACKAGES]).toEqual([...MIGRATION_PACKAGES]);
    expect(SCE_DS2_07B_EXCEPTION_IDS.REDIRECT).toBe(EXCEPTION_IDS.REDIRECT);
    expect(SCE_DS2_07B_EXCEPTION_IDS.PUBLIC).toBe(EXCEPTION_IDS.PUBLIC);
    expect(SCE_DS2_07B_EXCEPTION_IDS.PREVIEW).toBe(EXCEPTION_IDS.PREVIEW);
    expect(SCE_DS2_07B_EXCEPTION_IDS.PRINT).toBe(EXCEPTION_IDS.PRINT);
    const entry = SCE_DS2_07B_ROUTE_REGISTRY[0] as RegistryEntry;
    expect(entry.sourceFile.startsWith("app/")).toBe(true);
  });
});
