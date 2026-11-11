/**
 * SCE-DS2-07G batch 8 — evidence contract resolution helpers.
 */
import { describe, expect, it } from "vitest";

describe("SCE-DS2-07G batch-8 evidence contract", () => {
  it("classifies axe incomplete rules for manual review", async () => {
    const { classifyAxeIncomplete } = await import(
      "../../../scripts/lib/sce-ds2-07g-evidence-contract.mjs"
    );
    const result = classifyAxeIncomplete(["color-contrast:serious", "frame-tested:moderate"]);
    expect(result.manualReview).toContain("color-contrast");
    expect(result.keyboardSupplement).toContain("frame-tested");
  });

  it("does not close authenticated visual without screenshot review", async () => {
    const { isAuthenticatedVisualClosure } = await import(
      "../../../scripts/lib/sce-ds2-07g-evidence-contract.mjs"
    );
    const dimensions = {
      authentication: { status: "PASS" as const },
      authorization: { status: "PASS" as const },
      visual: { status: "PASS" as const, screenshotReviewed: false },
      responsive: {
        status: "PASS" as const,
        viewports: {
          desktop: { status: "PASS" as const },
          compactDesktop: { status: "PASS" as const },
          tablet: { status: "PASS" as const },
          mobile: { status: "PASS" as const },
        },
      },
      accessibility: { status: "PASS" as const },
      functional: { status: "PASS" as const },
    };
    expect(isAuthenticatedVisualClosure(dimensions)).toBe(false);
    expect(isAuthenticatedVisualClosure({ ...dimensions, visual: { status: "PASS", screenshotReviewed: true } })).toBe(
      true,
    );
  });

  it("marks future-module routes as functional NOT_APPLICABLE", async () => {
    const { resolveFunctionalDimension } = await import(
      "../../../scripts/lib/sce-ds2-07g-evidence-contract.mjs"
    );
    const result = resolveFunctionalDimension(
      { pageArchetype: "future-module", urlPattern: "/dashboard/mitglieder", intercept: false },
      null,
      { authBlocked: false },
    );
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("never marks accessibility PASS when axe violations exist", async () => {
    const { resolveAccessibilityDimension } = await import(
      "../../../scripts/lib/sce-ds2-07g-evidence-contract.mjs"
    );
    const result = resolveAccessibilityDimension(
      {
        violations: 2,
        incomplete: 0,
        violationSummaries: ["label:critical"],
        incompleteSummaries: [],
        keyboardProbeFailures: [],
      },
      { responsivePass: true, authBlocked: false },
    );
    expect(result.status).toBe("FAIL");
  });

  it("keeps accessibility PENDING on incomplete without claiming PASS from zero violations alone", async () => {
    const { resolveAccessibilityDimension } = await import(
      "../../../scripts/lib/sce-ds2-07g-evidence-contract.mjs"
    );
    const result = resolveAccessibilityDimension(
      {
        violations: 0,
        incomplete: 3,
        violationSummaries: [],
        incompleteSummaries: ["color-contrast:serious"],
        keyboardProbeFailures: [],
      },
      { responsivePass: true, authBlocked: false },
    );
    expect(result.status).toBe("PENDING");
    expect(result.incompleteClassification?.manualReview).toContain("color-contrast");
  });
});
