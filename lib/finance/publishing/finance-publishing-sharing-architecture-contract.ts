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
  "06C": "Controlled Live Sharing",
  "06D": "Publication Governance & History",
  "06E": "Distribution / Export Surfaces",
  "06F": "Privacy, Audience & Policy Hardening",
  "06G": "UX / Responsive / Release Hardening",
  "06H": "Programme Closure",
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
  fin06aStatus: "ARCHITECTURE_FOUNDATION_COMPLETE",
  fin06ProgrammeStatus: "IN_PROGRESS",
  fin06bStatus: "NOT_STARTED",
} as const;
