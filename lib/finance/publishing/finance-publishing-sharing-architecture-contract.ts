/**
 * SCE Finance FIN-06A — Financial Publishing & Sharing architecture contract.
 *
 * Pure types/constants plus documented boundaries — no full publishing UI,
 * PDF/email delivery, or live sharing product surfaces in FIN-06A.
 *
 * Principle: Complexity should exist in the system, not in the user's head.
 *
 * @see docs/finance/SCE-FINANCE-06-FINANCIAL-PUBLISHING-SHARING-ARCHITECTURE.md
 */

import {
  PROPOSED_FINANCE_PERMISSION_KEYS,
  SCE_FINANCE_PRODUCT_LOCKS,
} from "@/lib/finance/finance-architecture";
import { FINANCE_AMOUNT_STORAGE } from "@/lib/finance/money-types";
import {
  FINANCE_REPORTING_PUBLICATION_BOUNDARY,
  FINANCE_VISUAL_BENCHMARK,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";

/** FIN-06 programme product principle (locked). */
export const FINANCE_PUBLISHING_PRODUCT_PRINCIPLE =
  "COMPLEXITY SHOULD EXIST IN THE SYSTEM, NOT IN THE USER'S HEAD." as const;

export const FINANCE_PUBLISHING_SCE_UX_PRINCIPLE =
  "SIMPLE UNDERSTANDING. SHALLOW NAVIGATION. DEEP CAPABILITY." as const;

/** Canonical FIN-06 conceptual lock — four distinct concepts. */
export const FINANCE_PUBLISHING_CONCEPTUAL_LOCK = {
  sourceFinancialDataDistinctFromReport: true,
  liveReportDistinctFromShare: true,
  liveShareDistinctFromPublication: true,
  publicationDistinctFromLiveReport: true,
  genericReportEntityForbidden: true,
} as const;

/** A. Source financial data — authority remains FIN-01…FIN-05. */
export const FINANCE_PUBLISHING_SOURCE_DATA_BOUNDARY = {
  fin06IsNotSourceAuthority: true,
  authoritativeSources: [
    "FINANCE_STRUCTURE",
    "APPROVED_BUDGET",
    "ACTUAL",
    "CURRENT_FORECAST",
    "AUTOMATIC_FORECAST",
    "SCENARIOS",
    "EXPECTED_FINANCIAL_EVENTS",
    "FIN_05_REPORTING_READ_MODELS",
  ] as const,
  shareAndPublicationConsumeSources: true,
  shareAndPublicationDoNotMutateSources: true,
} as const;

/** B. Live report / live view — FIN-05 analytical surface; mutable with source data. */
export const FINANCE_LIVE_REPORT_DEFINITION = {
  kind: "LIVE_REPORT_VIEW",
  source: "FIN-05 reporting read models generated from current canonical sources",
  mutability: "EVOLVES_WITH_SOURCE_DATA",
  isPublication: false,
  isShare: false,
  fin05ReportingWorkspaceRoute: "/dashboard/finance/reports",
} as const;

/** C. Share — controlled access; may reference live/current view when policy permits. */
export const FINANCE_LIVE_SHARE_DEFINITION = {
  kind: "FINANCIAL_SHARE",
  mayReferenceLiveReportView: true,
  liveShareMayReflectCurrentData: true,
  sharingDoesNotImplyImmutablePublication: true,
  accessMayBeRevoked: true,
  surfacedAsLiveWhenLive: true,
  persistenceModel: "FinanceFinancialShare",
} as const;

/** D. Publication — formal approved versioned snapshot. */
export const FINANCE_PUBLICATION_DEFINITION = {
  kind: "FINANCIAL_PUBLICATION",
  publishedFinancialReportMeaning:
    "VERSIONED_AUDITABLE_SNAPSHOT_OF_APPROVED_REPORTING_SCOPE",
  mustNotSilentlyChangeWhenSourcesChange: true,
  correctionsRequireNewVersionOrPublication: true,
  persistenceModel: "FinancePublication + FinancePublicationVersion",
} as const;

/** Snapshot authority — minimum durable semantic payload (not UI state). */
export const FINANCE_PUBLICATION_SNAPSHOT_AUTHORITY = {
  schemaVersion: "sce.finance.publication.snapshot.v1",
  prepareOnceServeManyReads: true,
  doesNotDuplicateEntireFinanceDatabase: true,
  doesNotSerializeReactComponentState: true,
  requiredSemanticFields: [
    "tenantId",
    "publicationId",
    "publicationVersion",
    "title",
    "reportingPeriod",
    "reportingScope",
    "currencyCode",
    "publishedAt",
    "publisherUserId",
    "approvalState",
    "audiencePolicy",
    "sourceReferenceMetadata",
    "renderedReportingSemanticPayload",
    "hierarchyLabelsForInterpretation",
    "totals",
    "comparativeMeasuresIncluded",
    "explanatoryMetadata",
    "snapshotSchemaVersion",
  ] as const,
  sourceReferenceMetadataDocuments: [
    "financeYearId",
    "reportType",
    "reportingSemanticVersion",
    "measureVisibilitySnapshot",
  ] as const,
  readPathUsesStoredSnapshot: true,
  reconstructFromLiveDomainOnEveryReadForbidden: true,
} as const;

export const FINANCE_PUBLICATION_IMMUTABILITY_GUARDS = {
  publishedVersionPayloadImmutable: true,
  inPlaceMutationOfHistoricalVersionForbidden: true,
  supersessionPreservesHistoricalAudit: true,
  revocationDoesNotRewriteHistoricalMeaning: true,
  casualDeletionOfAuditHistoryForbidden: true,
} as const;

/** Release-critical boundary between live share and publication. */
export const FINANCE_LIVE_SHARE_VS_PUBLICATION_GUARDS = {
  liveShareMayEvolveWithCurrentData: true,
  publicationSnapshotImmutable: true,
  neverPresentLiveShareAsFormalPublication: true,
  liveShareLabeledLiveWhereSurfaced: true,
  publicationLabeledPublishedWhereSurfaced: true,
  alignsWithFin05Boundary: FINANCE_REPORTING_PUBLICATION_BOUNDARY.viewDoesNotImplyShareOrPublish,
} as const;

/** Canonical permission keys — view ≠ share ≠ publish. */
export const FINANCE_PUBLISHING_PERMISSION_KEYS = {
  viewFinancialReports: PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_VIEW,
  viewPublicationHistory: "finance.publication.view",
  shareFinancialReports: "finance.reporting.share",
  publishFinancialReports: "finance.reporting.publish",
  manageFinancialShares: "finance.share.manage",
} as const;

export const FINANCE_PUBLISHING_PERMISSION_MODEL = {
  viewDoesNotImplyShare: true,
  viewDoesNotImplyPublish: true,
  shareDoesNotImplyPublish: true,
  publishDoesNotImplyShare: true,
  manageSharesSeparateFromShare: true,
  serverAuthoritativeChecksRequired: true,
  noHardcodedRoleNames: true,
  keys: FINANCE_PUBLISHING_PERMISSION_KEYS,
} as const;

/** Bounded audience abstraction — extensible without FCA hardcoding. */
export const FINANCE_PUBLISHING_AUDIENCE_CLASSES = [
  "INTERNAL_AUTHENTICATED",
  "SPECIFIC_USERS",
  "SPECIFIC_ROLES",
  "ORGANISATION_MEMBERS",
  "LINK_RESTRICTED",
  "PUBLIC",
] as const;

export type FinancePublishingAudienceClass =
  (typeof FINANCE_PUBLISHING_AUDIENCE_CLASSES)[number];

export const FINANCE_PUBLISHING_AUDIENCE_MODEL = {
  audienceClasses: FINANCE_PUBLISHING_AUDIENCE_CLASSES,
  whoMayAccessSeparateFromFinancialScope: true,
  publicInternetNotOnlyDestination: true,
  minimumViableSetOnly: true,
} as const;

/** Tenant-configurable disclosure boundary — not a full policy engine in 06A. */
export const FINANCE_DISCLOSURE_POLICY_BOUNDARY = {
  tenantConfigurable: true,
  permissionAware: true,
  audienceAware: true,
  scopeAware: true,
  privacyAware: true,
  countryInformedViaAdaptersNotHardcoded: true,
  persistenceModel: "FinanceDisclosurePolicy",
  hugePolicyEngineDeferred: true,
  exampleFutureControls: [
    "externalSharingAllowed",
    "publicPublishingAllowed",
    "allowedReportingScopes",
    "sensitiveDimensionExclusions",
    "personLevelInformation",
    "accountLevelDetail",
    "internalNotesVisibility",
    "evidenceVisibility",
    "expiryAndRevocation",
    "exportPermissions",
    "publicationApprovalRequired",
  ] as const,
} as const;

/** Explicit reporting scope for shares and publications. */
export const FINANCE_PUBLISHING_REPORTING_SCOPE_MODEL = {
  financeYearOrReportingPeriodRequired: true,
  statementOrReportTypeRequired: true,
  optionalReportingGroupSelection: true,
  optionalAccountSelectionWhenPermitted: true,
  comparisonBasisExplicit: true,
  forecastInclusionExplicit: true,
  actualInclusionExplicit: true,
  hierarchyDetailLevelExplicit: true,
  organisationDimensionScopeWhenSupported: true,
  genericBiReportBuilderForbidden: true,
  fin05BoundedReportingSurfacesOnly: true,
} as const;

/** Publication lifecycle — deliberate publication vs preparation. */
export const FINANCE_PUBLICATION_LIFECYCLE_STATUSES = [
  "DRAFT",
  "READY",
  "PUBLISHED",
  "SUPERSEDED",
  "REVOKED",
] as const;

export type FinancePublicationLifecycleStatus =
  (typeof FINANCE_PUBLICATION_LIFECYCLE_STATUSES)[number];

export const FINANCE_PUBLICATION_LIFECYCLE = {
  statuses: FINANCE_PUBLICATION_LIFECYCLE_STATUSES,
  preparationDistinctFromPublication: true,
  publicationIsDeliberate: true,
  publishedSnapshotImmutable: true,
  newerPublicationMaySupersede: true,
  withdrawalDoesNotRewriteHistory: true,
  allowedTransitions: {
    DRAFT: ["READY", "REVOKED"],
    READY: ["PUBLISHED", "DRAFT", "REVOKED"],
    PUBLISHED: ["SUPERSEDED", "REVOKED"],
    SUPERSEDED: [] as const,
    REVOKED: [] as const,
  },
} as const;

export const FINANCE_PUBLICATION_AUDIT_MODEL = {
  preserveCreator: true,
  preservePublisherOrApprover: true,
  preserveTimestamps: true,
  preserveReportingScope: true,
  preservePublicationVersion: true,
  preserveSourceSemanticVersion: true,
  preserveAudienceDisclosureState: true,
  preserveSupersessionRevocationHistory: true,
  noCredentialsInAuditPayload: true,
  noUnnecessaryPersonalDataInAuditPayload: true,
} as const;

export const FINANCE_SHARE_LINK_SECURITY = {
  plaintextReusableSecretsAvoided: true,
  secureRandomTokens: true,
  storeHashesWherePossible: true,
  tenantScopedLookups: true,
  revocationSupported: true,
  enumerationAvoided: true,
  noFinancialMetadataBeforeAuthorization: true,
  noSensitiveStateInUrlParameters: true,
  expirySemanticsExplicit: true,
  completePublicSharingUiDeferred: true,
} as const;

/** Scale notes — aligned with SCE-SCALE-01. */
export const FINANCE_PUBLISHING_SCALE_MODEL = {
  snapshotCreationMayBeExpensiveOnce: true,
  publishedReadsShouldBeEfficient: true,
  noReconstructHistoricalPublicationFromLiveDomainOnEveryRead: true,
  noNewCacheInfrastructureInFin06A: true,
} as const;

/** Machine-testable architecture locks (FIN-06A). */
export const SCE_FINANCE_PUBLISHING_ARCHITECTURE_LOCKS = {
  publicationDistinctFromLiveReport: true,
  publicationDistinctFromLiveShare: true,
  immutablePublicationSnapshotSemantics: true,
  viewDistinctFromShareDistinctFromPublish: true,
  tenantIsolation: true,
  noHardcodedCurrency: true,
  noHardcodedChf: true,
  countryAgnosticCore: SCE_FINANCE_PRODUCT_LOCKS.countryAgnosticCore,
  noFin09LiquiditySemantics: true,
  noFin11AccountingStatutorySemantics: true,
  noGenericBiReportBuilder: true,
  snapshotDoesNotDependOnMutableUiComponentState: true,
  revokedAccessDoesNotRewriteHistoricalPublication: true,
  financeVisualBenchmarkIsDesignGrammarNotUniversalLayout: true,
  fin05RemainsSourceAuthority: true,
  integerMinorUnits: FINANCE_AMOUNT_STORAGE.representation === "AMOUNT_MINOR_INTEGER",
} as const;

export const FINANCE_PUBLISHING_FIN05_BOUNDARY = {
  fin05ProvidesLiveAnalyticalReporting: true,
  fin06ConsumesFin05ReadModelsForSnapshotInput: true,
  fin05DoesNotImplementPublishing: FINANCE_REPORTING_PUBLICATION_BOUNDARY.fin05DefinesIntelligenceOnly,
} as const;

export const FINANCE_PUBLISHING_PROGRAMME_BOUNDARIES = {
  fin07: "COMMITMENTS_AND_APPROVALS — NOT STARTED",
  fin08: "REVENUE_RECEIVABLES — NOT STARTED",
  fin09: "LIQUIDITY_TREASURY — NOT STARTED",
  fin10: "FUNDS_GRANTS — NOT STARTED",
  fin11: "ACCOUNTING_STATUTORY — NOT STARTED",
  genericBi: "FORBIDDEN_IN_FIN06_CORE",
  statutoryAccounting: "FIN_11_ONLY",
} as const;

export const FINANCE_PUBLISHING_DESIGN_DIRECTION = {
  financeVisualBenchmark: FINANCE_VISUAL_BENCHMARK,
  designGrammarNotIdenticalLayouts: true,
  noCardSoupAdminDashboard: true,
  noHeroKpiManufacturing: true,
  sceDesign02NotStarted: true,
  fin06aDoesNotRedesignUnrelatedFinanceScreens: true,
} as const;

/** FIN-06 package decomposition (evidence-based; remainder of programme). */
export const FINANCE_06_PACKAGE_PLAN = {
  "06A": "Publishing & Sharing Architecture Foundation",
  "06B": "Publication Snapshot & Versioning",
  "06C": "Published Artifacts & Distribution",
  "06D": "Publication Governance & History",
  "06E": "Distribution / Export Surfaces (may fold into 06C slices)",
  "06F": "Privacy, Audience & Policy Hardening",
  "06G": "UX / Responsive / Release Hardening",
  "06H": "Programme Closure",
} as const;

/** FIN-06C — product model (defined in R6; not implemented in FIN-06B). */
export const FINANCE_06C_PRODUCT_MODEL = {
  canonicalProgression: [
    "LIVE_REPORT",
    "PUBLISH",
    "OFFICIAL_IMMUTABLE_VERSION",
    "DISTRIBUTE",
  ] as const,
  publicationWithoutDistributionIsInfrastructureNotCompleteOutcome: true,
  userFacingOutcome:
    "I have made this report official and can now send it.",
  systemOwnsComplexity: [
    "snapshotting",
    "immutability",
    "versionNumbering",
    "historicalPreservation",
    "permissions",
    "artifactGeneration",
    "distributionIntegrity",
  ] as const,
  fin06cStatus: "IN_PROGRESS",
  fin06cPdfExportSliceStatus: "COMPLETE_PO_APPROVED",
  fin06cControlledSharingSliceStatus: "IN_PROGRESS_R1_IMPLEMENTED",
  fin06cEmailDistributionSliceStatus: "NOT_STARTED",
} as const;

/** FIN-06D — controlled publication version sharing (R1). */
export const FINANCE_06D_PUBLICATION_SHARE_MODEL = {
  shareTarget: "FinancePublicationVersion",
  neverShareLiveFin05Report: true,
  neverSilentlyFollowLatestVersion: true,
  persistenceModel: "FinancePublicationShare",
  lifecycleDerived: ["ACTIVE", "REVOKED", "EXPIRED"] as const,
  tokenStorage: "SHA-256 digest only; raw token shown once at creation",
  externalRoutePrefix: "/share/finance/publication",
  pdfThroughShareAuthorizedPath: "/api/share/finance/publication/{token}/pdf",
  emailDistribution: "FIN-06E — NOT STARTED",
  fin06dR1Status: "IMPLEMENTED_PO_UAT_PENDING",
} as const;

/** PDF must consume immutable publication snapshot — never live FIN-05 for historical versions. */
export const FINANCE_06C_PDF_ARTIFACT_REQUIREMENT = {
  firstClassRequirement: true,
  exampleFilenamePattern:
    "{organisation} – {reportTitle} {period} – Version {versionNumber}.pdf",
  readPath: [
    "FinancePublicationVersion",
    "snapshotPayloadJson",
    "publicationPresentationReadModel",
    "pdfArtifact",
  ] as const,
  forbiddenReadPath: [
    "FinancePublicationVersion",
    "currentFinanceReadModel",
    "pdfArtifact",
  ] as const,
  semanticInvariance:
    "PDF(Vn) financial semantics identical regardless of later live source changes",
  byteIdenticalNotRequiredWhenMetadataDiffers: true,
} as const;

/** Progressive distribution capabilities — scoped slices, not generic DMS or email marketing. */
export const FINANCE_06C_DISTRIBUTION_BOUNDARIES = {
  initialSlices: [
    "PDF_HERUNTERLADEN",
    "CONTROLLED_SHARING_OF_SPECIFIC_PUBLICATION_VERSION",
    "EMAIL_DISTRIBUTION_OF_SPECIFIC_PUBLICATION_VERSION",
  ] as const,
  laterCapabilitiesMayInclude: [
    "expiration",
    "recipientManagement",
    "internalOrganisationAudiences",
    "externalInvitedRecipients",
    "revocation",
    "deliveryAudit",
    "publicAccessWhenTenantPolicyPermits",
    "otherExportFormats",
  ] as const,
  forbiddenInFin06C: [
    "genericDocumentManagementPlatform",
    "genericEmailMarketingSystem",
    "fin08Invoicing",
    "fin11StatutoryAccountingOutput",
  ] as const,
} as const;

/** FIN-06C UX direction (recorded R6 — not FIN-06B implementation). */
export const FINANCE_06C_UX_DIRECTION = {
  primaryAction: "Veröffentlichen",
  quieterHistoryEntry: "Veröffentlichte Berichte (N)",
  inPublicationActions: ["PDF herunterladen", "Teilen", "Per E-Mail senden"] as const,
  historyStatusLabels: { current: "Aktuell", superseded: "Ersetzt" } as const,
  doNotExposeToUsers: [
    "snapshotPayloadJson",
    "schemaVersion",
    "databaseId",
    "immutableRow",
  ] as const,
  userVisibleMetadata: [
    "version",
    "publishedDate",
    "reportingPeriod",
    "reportType",
    "status",
    "distributionActions",
  ] as const,
} as const;

/** Distributed artifact presentation — document-like, not Finance UI screenshot. */
export const FINANCE_06C_ARTIFACT_PRESENTATION = {
  documentLikeNotInteractiveWorkspace: true,
  identityHeaderFields: [
    "organisation",
    "reportTitle",
    "financialYearOrReportingPeriod",
    "publicationVersion",
    "publicationDate",
    "currency",
    "optionalPublishedByWhenPolicyAllows",
  ] as const,
  contentHierarchy: [
    "CONCLUSION",
    "KEY_FINANCIAL_SUMMARY",
    "MANAGEMENT_PNL",
    "relevantExplanationContext",
  ] as const,
  excludeFromArtifact: [
    "investigationControls",
    "editControls",
    "appNavigation",
    "internalIds",
    "completeInteractiveApplicationDump",
  ] as const,
} as const;

export const FINANCE_06A_SCOPE = {
  architectureDoc: true,
  architectureContract: true,
  permissionFoundation: true,
  additivePersistenceFoundation: true,
  lifecycleAndScopeValidation: true,
  architectureGuardTests: true,
  minimalFoundationUi: true,
  noCompletePublishingWorkspace: true,
  noCompleteLiveSharingUi: true,
  noPdfEmailNotifications: true,
  noFin06BImplementation: true,
} as const;

export const FINANCE_06A_IMPLEMENTATION = {
  architectureDoc:
    "docs/finance/SCE-FINANCE-06-FINANCIAL-PUBLISHING-SHARING-ARCHITECTURE.md",
  architectureContract:
    "lib/finance/publishing/finance-publishing-sharing-architecture-contract.ts",
  architectureTestSuite:
    "lib/finance/__tests__/finance-06a-publishing-sharing-architecture.test.ts",
  foundationWorkspaceRoute: "/dashboard/finance/publishing",
  fin06aStatus: "COMPLETE_PO_APPROVED",
  fin06ProgrammeStatus: "IN_PROGRESS",
  fin06bStatus: "COMPLETE_PO_APPROVED",
} as const;

/** FIN-06B-R7 release closure — Product Owner final visual UAT + merge authorization. */
export const FINANCE_06B_R7_RELEASE_CLOSURE = {
  fin06bFinalProductOwnerVisualUat: "PASS",
  fin06bPublicationImmutability: "PASS",
  fin06bPublicationVersioning: "PASS",
  fin06bR4PoVisualUat: "PASS",
  fin06bR5ImmutabilityCheckpoint: "PASS",
  fin06bR6Version2PoUat: "PASS",
  fin06bR7FinalClosure: "PASS",
  mergeAuthorizationPending: false,
  mergedToStage: true,
  prNumber: 917,
  stageMergeCommit: "2ecc6789d7f4d2e7e25c5415752d3b69be69c611",
  closureBranch: "cursor/sce-finance-06b-publication-snapshot-versioning",
  r7ClosureDoc: "docs/finance/SCE-FINANCE-06B-R7-FINAL-CLOSURE.md",
  r7StageVerifyScript: "scripts/sce-finance-06b-r7-stage-publication-closure-verify.ts",
  fin06ProgrammeRemainsInProgress: true,
  fin06cStatus: "DEFINED_NOT_STARTED",
  productionTouched: false,
} as const;

/** FIN-06C PDF / export slice — Product Owner visual UAT + merge closure (PR #918). */
export const FINANCE_06C_PDF_EXPORT_RELEASE_CLOSURE = {
  fin06cPdfExportPoVisualUat: "PASS",
  fin06cPdfExportImmutability: "PASS",
  fin06cPdfExportLayoutContract: "PASS",
  fin06cPdfExportBrandingContract: "PASS",
  fin06cPdfExportFinalClosure: "PASS",
  approvedVisualBaselineCommit: "3c6f169f68d36eaf50d18748370467189259f768",
  mergeAuthorizationPending: false,
  mergedToStage: false,
  prNumber: 918,
  closureBranch: "cursor/sce-finance-06c-distribution-export",
  closureDoc: "docs/finance/SCE-FINANCE-06C-PDF-EXPORT-FINAL-CLOSURE.md",
  fin06cPdfExportSliceStatus: "COMPLETE_PO_APPROVED",
  fin06cControlledSharingSliceStatus: "NOT_STARTED",
  fin06cEmailDistributionSliceStatus: "NOT_STARTED",
  fin06cPackageRemainsInProgress: true,
  fin06ProgrammeRemainsInProgress: true,
  fullTaggedPdfRequiresFuturePdfEngineDecision: true,
  productionTouched: false,
} as const;

export const FINANCE_06B_IMPLEMENTATION = {
  snapshotBuilder: "lib/finance/publishing/build-finance-publication-snapshot-v1.ts",
  snapshotValidator: "lib/finance/publishing/validate-finance-publication-snapshot-v1.ts",
  publicationService: "lib/finance/services/finance-publication-service.ts",
  publicationQueryService: "lib/finance/services/finance-publication-query-service.ts",
  publicationTestSuite:
    "lib/finance/__tests__/finance-06b-publication-snapshot-versioning.test.ts",
  r6VersioningContractTest:
    "lib/finance/__tests__/finance-06b-r6-versioning-contract.test.ts",
  r6PoUatInstructionDoc: "docs/finance/SCE-FINANCE-06B-R6-PO-VERSION-2-UAT.md",
  r6StagePrepScript: "scripts/sce-finance-06b-r6-stage-version2-uat-prep.ts",
  r7ReleaseClosureTest: "lib/finance/__tests__/finance-06b-r7-release-closure.test.ts",
  firstReportScope: "MANAGEMENT_PNL",
  publishUiRoute: "/dashboard/finance/reports",
  fin06bStatus: "COMPLETE_PO_APPROVED",
  fin06bR4PoVisualUat: "PASS",
  fin06bR5PoImmutabilityCheckpoint: "PASS",
  fin06bR6Version2PoUat: "PASS",
  fin06bR7FinalClosure: "PASS",
  fin06bR6Status: "VERSION_2_PO_UAT_PASS",
  fin06cStatus: "IN_PROGRESS",
  fin06cR1Status: "COMPLETE_PO_APPROVED",
  fin06cPdfExportSliceStatus: "COMPLETE_PO_APPROVED",
} as const;
