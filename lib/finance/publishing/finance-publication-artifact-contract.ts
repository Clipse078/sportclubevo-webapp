/**
 * FIN-06C — publication artifact model (distribution/export).
 *
 * R1: PDF is generated on demand from immutable snapshot + presentation.
 * No separate artifact persistence row is required yet; the domain model stays
 * extensible for future stored artifacts and delivery audit.
 */

export const FINANCE_PUBLICATION_ARTIFACT_KINDS = ["PDF"] as const;

export type FinancePublicationArtifactKind =
  (typeof FINANCE_PUBLICATION_ARTIFACT_KINDS)[number];

/** Canonical artifact pipeline — must not read live FIN-05 for historical versions. */
export const FINANCE_PUBLICATION_ARTIFACT_PIPELINE = {
  readPath: [
    "FinancePublicationVersion",
    "snapshotPayloadJson",
    "FinancePublicationPresentation",
    "FinancePublicationArtifact",
  ] as const,
  forbiddenReadPath: [
    "FinancePublicationVersion",
    "loadFinanceManagementPnlReadModel",
    "FinancePublicationArtifact",
  ] as const,
  mutatesSnapshotOnGenerate: false,
  incrementsVersionOnDownload: false,
  persistenceRequiredInR1: false,
  onDemandGenerationFromSnapshot: true,
  futureArtifactPersistenceAllowed: true,
} as const;

export const FINANCE_PUBLICATION_PDF_ARTIFACT = {
  kind: "PDF" as const,
  mimeType: "application/pdf",
  defaultPageFormat: "A4_PORTRAIT",
  technology: "pdf-lib",
  referenceImplementation:
    "lib/finance/artifacts/finance-publication-pdf/generate-finance-publication-pdf.ts",
  downloadPermission: "finance.publication.view",
  downloadRequiresFinanceView: true,
} as const;

export const FINANCE_06C_R2_IMPLEMENTATION = {
  packageId: "FIN-06C-R2",
  status: "IMPLEMENTED",
  predecessor: "FIN-06C-R1",
  focus: "publication_pdf_design_accessibility_hardening",
  pdfGenerator: "lib/finance/artifacts/finance-publication-pdf/generate-finance-publication-pdf.ts",
  accessibilityDoc:
    "docs/finance/SCE-FINANCE-06C-R2-PUBLICATION-PDF-DESIGN-ACCESSIBILITY.md",
  testSuite: "lib/finance/__tests__/finance-06c-r2-publication-pdf-design.test.ts",
  fin06cStatus: "IN_PROGRESS",
  fin06ProgrammeStatus: "IN_PROGRESS",
} as const;

export const FINANCE_06C_R3_IMPLEMENTATION = {
  packageId: "FIN-06C-R3",
  status: "IMPLEMENTED_PO_UAT_PENDING",
  predecessor: "FIN-06C-R2",
  focus: "publication_pdf_po_approved_visual_design",
  pdfGenerator: "lib/finance/artifacts/finance-publication-pdf/generate-finance-publication-pdf.ts",
  designDoc: "docs/finance/SCE-FINANCE-06C-R3-PUBLICATION-PDF-POLISH.md",
  testSuite: "lib/finance/__tests__/finance-06c-r3-publication-pdf-polish.test.ts",
  fin06cStatus: "IN_PROGRESS",
  fin06ProgrammeStatus: "IN_PROGRESS",
} as const;

export const FINANCE_06C_R1_IMPLEMENTATION = {
  packageId: "FIN-06C-R1",
  status: "IMPLEMENTED",
  artifactContract: "lib/finance/publishing/finance-publication-artifact-contract.ts",
  pdfGenerator: "lib/finance/artifacts/finance-publication-pdf/generate-finance-publication-pdf.ts",
  artifactService: "lib/finance/services/finance-publication-artifact-service.ts",
  downloadRoute:
    "/api/dashboard/finance/publications/[publicationId]/versions/[versionNumber]/pdf",
  testSuite: "lib/finance/__tests__/finance-06c-r1-publication-pdf-artifact.test.ts",
  fin06cStatus: "IN_PROGRESS",
  fin06ProgrammeStatus: "IN_PROGRESS",
} as const;
