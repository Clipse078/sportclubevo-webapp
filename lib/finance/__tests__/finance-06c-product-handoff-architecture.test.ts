import { describe, expect, it } from "vitest";
import {
  FINANCE_06B_IMPLEMENTATION,
  FINANCE_06C_ARTIFACT_PRESENTATION,
  FINANCE_06C_DISTRIBUTION_BOUNDARIES,
  FINANCE_06C_PDF_ARTIFACT_REQUIREMENT,
  FINANCE_06C_PRODUCT_MODEL,
  FINANCE_06C_UX_DIRECTION,
  FINANCE_06_PACKAGE_PLAN,
  FINANCE_PUBLISHING_PERMISSION_MODEL,
} from "@/lib/finance/publishing/finance-publishing-sharing-architecture-contract";

describe("FIN-06C product handoff architecture (R6)", () => {
  it("locks LIVE → PUBLISH → VERSION → DISTRIBUTE without collapsing concepts", () => {
    expect(FINANCE_06C_PRODUCT_MODEL.canonicalProgression).toEqual([
      "LIVE_REPORT",
      "PUBLISH",
      "OFFICIAL_IMMUTABLE_VERSION",
      "DISTRIBUTE",
    ]);
    expect(FINANCE_06C_PRODUCT_MODEL.fin06cStatus).toBe("DEFINED_NOT_STARTED");
    expect(FINANCE_06B_IMPLEMENTATION.fin06cStatus).toBe("DEFINED_NOT_STARTED");
    expect(FINANCE_06B_IMPLEMENTATION.fin06bR6Status).toBe("VERSION_2_PO_UAT_PASS");
    expect(FINANCE_06B_IMPLEMENTATION.fin06bStatus).toBe("COMPLETE_PO_APPROVED");
  });

  it("requires PDF generation from immutable snapshot only", () => {
    expect(FINANCE_06C_PDF_ARTIFACT_REQUIREMENT.firstClassRequirement).toBe(true);
    expect(FINANCE_06C_PDF_ARTIFACT_REQUIREMENT.readPath[1]).toBe("snapshotPayloadJson");
    expect(FINANCE_06C_PDF_ARTIFACT_REQUIREMENT.forbiddenReadPath[1]).toBe(
      "currentFinanceReadModel",
    );
  });

  it("scopes distribution without generic platforms or other programmes", () => {
    expect(FINANCE_06C_DISTRIBUTION_BOUNDARIES.initialSlices).toContain("PDF_HERUNTERLADEN");
    expect(FINANCE_06C_DISTRIBUTION_BOUNDARIES.forbiddenInFin06C).toContain("fin08Invoicing");
    expect(FINANCE_06C_DISTRIBUTION_BOUNDARIES.forbiddenInFin06C).toContain(
      "fin11StatutoryAccountingOutput",
    );
  });

  it("preserves VIEW ≠ SHARE ≠ PUBLISH permission boundaries", () => {
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.viewDoesNotImplyPublish).toBe(true);
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.shareDoesNotImplyPublish).toBe(true);
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.publishDoesNotImplyShare).toBe(true);
  });

  it("records UX and artifact presentation direction", () => {
    expect(FINANCE_06C_UX_DIRECTION.primaryAction).toBe("Veröffentlichen");
    expect(FINANCE_06C_ARTIFACT_PRESENTATION.excludeFromArtifact).toContain("internalIds");
    expect(FINANCE_06_PACKAGE_PLAN["06C"]).toContain("Published Artifacts");
  });
});
