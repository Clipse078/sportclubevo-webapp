import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  FINANCE_06A_IMPLEMENTATION,
  FINANCE_06A_SCOPE,
  FINANCE_06_PACKAGE_PLAN,
  FINANCE_DISCLOSURE_POLICY_BOUNDARY,
  FINANCE_LIVE_REPORT_DEFINITION,
  FINANCE_LIVE_SHARE_DEFINITION,
  FINANCE_LIVE_SHARE_VS_PUBLICATION_GUARDS,
  FINANCE_PUBLICATION_DEFINITION,
  FINANCE_PUBLICATION_IMMUTABILITY_GUARDS,
  FINANCE_PUBLICATION_LIFECYCLE,
  FINANCE_PUBLICATION_SNAPSHOT_AUTHORITY,
  FINANCE_PUBLISHING_AUDIENCE_MODEL,
  FINANCE_PUBLISHING_PERMISSION_MODEL,
  FINANCE_PUBLISHING_PROGRAMME_BOUNDARIES,
  FINANCE_PUBLISHING_SOURCE_DATA_BOUNDARY,
  SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS,
} from "@/lib/finance/publishing/finance-publishing-sharing-architecture-contract";
import { assertFinancePublicationLifecycleTransition } from "@/lib/finance/publishing/finance-publication-lifecycle";
import {
  assertFinancePublishingReportingScope,
  type FinancePublishingReportingScope,
} from "@/lib/finance/publishing/finance-publication-scope";
import {
  canPublishFinancialReports,
  canShareFinancialReports,
  canViewFinancePublicationHistory,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import { financePublishingRestrictedState } from "@/lib/finance/publishing/finance-publishing-restricted-state";
import {
  generateFinanceShareLinkToken,
  hashFinanceShareLinkToken,
  verifyFinanceShareLinkToken,
} from "@/lib/finance/publishing/finance-share-link-token";
import { financePublicationExistsForTenant } from "@/lib/finance/services/finance-publishing-foundation-query-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";

const repoRoot = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function ctx(keys: string[]): FinanceAuthContext {
  return {
    tenantId: "tenant-a",
    userId: "user-1",
    permissionKeys: new Set(keys),
  };
}

describe("FIN-06A publishing & sharing architecture locks", () => {
  it("locks conceptual boundaries and programme scope", () => {
    expect(SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS.publicationDistinctFromLiveReport).toBe(true);
    expect(SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS.publicationDistinctFromLiveShare).toBe(true);
    expect(SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS.immutablePublicationSnapshotSemantics).toBe(
      true,
    );
    expect(SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS.viewDistinctFromShareDistinctFromPublish).toBe(
      true,
    );
    expect(SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS.noHardcodedChf).toBe(true);
    expect(SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS.countryAgnosticCore).toBe(true);
    expect(SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS.noFin09LiquiditySemantics).toBe(true);
    expect(SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS.noFin11AccountingStatutorySemantics).toBe(
      true,
    );
    expect(SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS.noGenericBiReportBuilder).toBe(true);
    expect(
      SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS.snapshotDoesNotDependOnMutableUiComponentState,
    ).toBe(true);
    expect(
      SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS.revokedAccessDoesNotRewriteHistoricalPublication,
    ).toBe(true);
    expect(FINANCE_06A_SCOPE.noCompletePublishingWorkspace).toBe(true);
    expect(FINANCE_06A_IMPLEMENTATION.fin06bStatus).toBe("COMPLETE_PO_APPROVED");
  });

  it("defines source data, live report, share, and publication distinctly", () => {
    expect(FINANCE_PUBLISHING_SOURCE_DATA_BOUNDARY.fin06IsNotSourceAuthority).toBe(true);
    expect(FINANCE_LIVE_REPORT_DEFINITION.isPublication).toBe(false);
    expect(FINANCE_LIVE_SHARE_DEFINITION.liveShareMayReflectCurrentData).toBe(true);
    expect(FINANCE_PUBLICATION_DEFINITION.mustNotSilentlyChangeWhenSourcesChange).toBe(true);
    expect(FINANCE_LIVE_SHARE_VS_PUBLICATION_GUARDS.neverPresentLiveShareAsFormalPublication).toBe(
      true,
    );
  });

  it("documents snapshot authority and immutability", () => {
    expect(FINANCE_PUBLICATION_SNAPSHOT_AUTHORITY.schemaVersion).toBe(
      "sce.finance.publication.snapshot.v1",
    );
    expect(FINANCE_PUBLICATION_SNAPSHOT_AUTHORITY.doesNotSerializeReactComponentState).toBe(true);
    expect(FINANCE_PUBLICATION_IMMUTABILITY_GUARDS.publishedVersionPayloadImmutable).toBe(true);
    expect(FINANCE_PUBLICATION_LIFECYCLE.publishedSnapshotImmutable).toBe(true);
  });

  it("preserves permission, audience, and disclosure boundaries", () => {
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.viewDoesNotImplyShare).toBe(true);
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.viewDoesNotImplyPublish).toBe(true);
    expect(FINANCE_PUBLISHING_AUDIENCE_MODEL.whoMayAccessSeparateFromFinancialScope).toBe(true);
    expect(FINANCE_DISCLOSURE_POLICY_BOUNDARY.hugePolicyEngineDeferred).toBe(true);
    expect(FINANCE_PUBLISHING_PROGRAMME_BOUNDARIES.fin07).toContain("FIN-07");
  });
});

describe("FIN-06A permission separation", () => {
  it("requires explicit keys for view history, share, and publish", () => {
    const viewOnly = ctx([PERMISSIONS.FINANCE_VIEW]);
    expect(canViewFinancePublicationHistory(viewOnly)).toBe(false);
    expect(canShareFinancialReports(viewOnly)).toBe(false);
    expect(canPublishFinancialReports(viewOnly)).toBe(false);

    const publisher = ctx([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_PUBLICATION_VIEW,
      PERMISSIONS.FINANCE_REPORTING_PUBLISH,
    ]);
    expect(canViewFinancePublicationHistory(publisher)).toBe(true);
    expect(canPublishFinancialReports(publisher)).toBe(true);
    expect(canShareFinancialReports(publisher)).toBe(false);
  });

  it("aligns architecture permission keys with PERMISSIONS catalog", () => {
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.keys.viewFinancialReports).toBe(
      PERMISSIONS.FINANCE_VIEW,
    );
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.keys.shareFinancialReports).toBe(
      PERMISSIONS.FINANCE_REPORTING_SHARE,
    );
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.keys.publishFinancialReports).toBe(
      PERMISSIONS.FINANCE_REPORTING_PUBLISH,
    );
  });
});

describe("FIN-06A scope and lifecycle validation", () => {
  const validScope: FinancePublishingReportingScope = {
    financeYearId: "fy-1",
    reportType: "MANAGEMENT_PNL",
    includeActual: true,
    includeApprovedBudget: true,
    includeCurrentForecast: false,
    includeAutomaticForecast: false,
    includeScenarios: false,
    hierarchyDetailLevel: "REPORTING_GROUPS",
  };

  it("accepts bounded canonical reporting scope", () => {
    expect(() => assertFinancePublishingReportingScope(validScope)).not.toThrow();
  });

  it("rejects scope without measures", () => {
    expect(() =>
      assertFinancePublishingReportingScope({
        ...validScope,
        includeActual: false,
        includeApprovedBudget: false,
      }),
    ).toThrow(/at least one permitted measure/i);
  });

  it("enforces lifecycle transitions and immutability semantics", () => {
    expect(() => assertFinancePublicationLifecycleTransition("DRAFT", "READY")).not.toThrow();
    expect(() => assertFinancePublicationLifecycleTransition("PUBLISHED", "DRAFT")).toThrow();
  });
});

describe("FIN-06A share link security", () => {
  it("stores hashes, not raw tokens", () => {
    const { rawToken, tokenHash } = generateFinanceShareLinkToken();
    expect(rawToken.length).toBeGreaterThan(20);
    expect(tokenHash).toBe(hashFinanceShareLinkToken(rawToken));
    expect(verifyFinanceShareLinkToken(rawToken, tokenHash)).toBe(true);
    expect(verifyFinanceShareLinkToken("wrong", tokenHash)).toBe(false);
  });
});

describe("FIN-06A restricted state protection", () => {
  it("does not leak financial metadata in restricted states", () => {
    const state = financePublishingRestrictedState("PUBLICATION");
    expect(state.availability).toBe("RESTRICTED");
    expect(state.leakFinancialMetadata).toBe(false);
    expect(Object.keys(state)).not.toContain("totals");
  });
});

describe("FIN-06A tenant isolation", () => {
  it("resolves publications only within tenant scope", async () => {
    const findFirst = vi.fn(async () => null);
    const prisma = { financePublication: { findFirst } } as unknown as Parameters<
      typeof financePublicationExistsForTenant
    >[0];
    const exists = await financePublicationExistsForTenant(prisma, "tenant-a", "pub-1");
    expect(exists).toBe(false);
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "pub-1", tenantId: "tenant-a" },
      select: { id: true },
    });
  });
});

describe("FIN-06A documentation and roadmap", () => {
  it("publishes canonical FIN-06 architecture document", () => {
    const doc = readRepo(
      "docs/finance/SCE-FINANCE-06-FINANCIAL-PUBLISHING-SHARING-ARCHITECTURE.md",
    );
    expect(doc).toContain("FIN-06A");
    expect(doc).toContain("LIVE SHARE");
    expect(doc).toContain("PUBLICATION");
    expect(doc).toContain("finance-publishing-sharing-architecture-contract.ts");
    expect(doc).toContain("VIEW");
    expect(doc).toContain("SHARE");
    expect(doc).toContain("PUBLISH");
  });

  it("updates finance programme roadmap for FIN-06A", () => {
    const roadmap = readRepo("docs/roadmap/SCE-FINANCE-01.md");
    expect(roadmap).toContain("FIN-06A");
    expect(roadmap).toMatch(/FIN-06.*COMPLETE.*PO APPROVED/i);
    expect(roadmap).toMatch(/FIN-07.*NOT STARTED/i);
  });

  it("records ADR-039 for publishing boundary", () => {
    const adr = readRepo("docs/roadmap/05-architecture-decisions.md");
    expect(adr).toContain("ADR-039");
    expect(adr).toContain("Financial Publishing");
  });

  it("declares FIN-06 package plan through 06H", () => {
    expect(FINANCE_06_PACKAGE_PLAN["06A"]).toContain("Architecture Foundation");
    expect(FINANCE_06_PACKAGE_PLAN["06H"]).toContain("Closure");
  });
});

describe("FIN-06A country and currency agnosticism (static guards)", () => {
  const publishingSources = [
    readRepo("lib/finance/publishing/finance-publishing-sharing-architecture-contract.ts"),
    readRepo("lib/finance/publishing/finance-publication-scope.ts"),
    readRepo("lib/finance/services/finance-publishing-foundation-query-service.ts"),
  ].join("\n");

  it("does not hardcode Switzerland or CHF in FIN-06A core", () => {
    expect(publishingSources).not.toMatch(/\bSwitzerland\b/i);
    expect(publishingSources).not.toMatch(/\bVereinsrecht\b/i);
    expect(publishingSources).not.toMatch(/"CHF"/);
  });
});

describe("FIN-06A foundation UI contract", () => {
  it("declares publishing foundation route without binary checkboxes", () => {
    const page = readRepo("app/(admin)/dashboard/finance/publishing/page.tsx");
    expect(page).toContain("FinancePublishingFoundationPanel");
    expect(page).not.toContain('type="checkbox"');
    const panel = readRepo("components/admin/finance/publishing/FinancePublishingFoundationPanel.tsx");
    expect(panel).not.toContain('type="checkbox"');
  });
});
