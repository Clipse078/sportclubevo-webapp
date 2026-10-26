/**
 * SCE Finance FIN-07A — Commitments & approvals architecture contract.
 *
 * Pure types/constants plus documented boundaries — no full commitment workspace,
 * approval inbox, supplier-bill ingestion, or budget arithmetic in FIN-07A.
 *
 * Locked principle:
 *   COMMITMENT ≠ ACTUAL ≠ PAYMENT ≠ BANK TRANSACTION ≠ ACCOUNTING ENTRY
 *
 * @see docs/finance/SCE-FINANCE-07-COMMITMENTS-APPROVALS-ARCHITECTURE.md
 */

import {
  PROPOSED_FINANCE_PERMISSION_KEYS,
  SCE_FINANCE_PRODUCT_LOCKS,
} from "@/lib/finance/finance-architecture";
import { FINANCE_AMOUNT_STORAGE } from "@/lib/finance/money-types";
import {
  EXPECTED_FINANCIAL_EVENT_CANONICAL_MODEL_NAME,
  EXPECTED_FINANCIAL_EVENT_SOURCE_KINDS,
} from "@/lib/finance/forecast/expected-financial-event-architecture-contract";

/** FIN-07 programme product principle (locked). */
export const FINANCE_COMMITMENT_PRODUCT_PRINCIPLE =
  "COMPLEXITY SHOULD EXIST IN THE SYSTEM, NOT IN THE USER'S HEAD." as const;

export const FINANCE_COMMITMENT_SCE_UX_PRINCIPLE =
  "SIMPLE UNDERSTANDING. SHALLOW NAVIGATION. DEEP CAPABILITY." as const;

/** Canonical FIN-07 conceptual lock — five distinct settlement layers. */
export const FINANCE_COMMITMENT_CONCEPTUAL_LOCK = {
  commitmentDistinctFromActual: true,
  commitmentDistinctFromPayment: true,
  commitmentDistinctFromBankTransaction: true,
  commitmentDistinctFromAccountingEntry: true,
  commitmentDistinctFromBudgetLine: true,
  commitmentDistinctFromCurrentForecast: true,
  approvedDoesNotMeanPaid: true,
  committedDoesNotMeanActual: true,
  fulfilledDoesNotMeanAccounted: true,
} as const;

export const FINANCE_COMMITMENT_LOCKED_PRINCIPLE =
  "COMMITMENT ≠ ACTUAL ≠ PAYMENT ≠ BANK TRANSACTION ≠ ACCOUNTING ENTRY" as const;

/** FIN-07 is organisation financial obligation governance — not statutory AP/GL. */
export const FINANCE_COMMITMENT_PROGRAMME_BOUNDARY = {
  notBankConnectivity: true,
  notBankReconciliation: true,
  notPaymentExecution: true,
  notTreasuryOrLiquidity: true,
  notGeneralLedger: true,
  notStatutoryAccounting: true,
  notInvoiceGenerationProduct: true,
  notReceivablesCollection: true,
  fin08Receivables: "REVENUE_RECEIVABLES_COLLECTIONS",
  fin09Liquidity: "LIQUIDITY_TREASURY",
  fin11Accounting: "ACCOUNTING_FOUNDATION_STATUTORY",
  sceBank01: "BANKING_CONNECTIVITY_RECONCILIATION",
  sceFinExt01: "ACCOUNTING_PLATFORM_INTEGRATION",
  supplierBillsAreOperationalInputsNotFullApModule: true,
} as const;

/** Persistence model names (FIN-07A foundation). */
export const FINANCE_COMMITMENT_PERSISTENCE_MODEL = {
  commitment: "FinanceCommitment",
  approvalDecision: "FinanceCommitmentApprovalDecision",
  economicEvidenceLink: "FinanceEconomicEvidenceLink",
} as const;

/** Governance lifecycle — organisational obligation state (not approval state). */
export const FINANCE_COMMITMENT_LIFECYCLE_STATUS = [
  "DRAFT",
  "SUBMITTED",
  "ACTIVE",
  "FULFILLED",
  "CANCELLED",
] as const;

export type FinanceCommitmentLifecycleStatus =
  (typeof FINANCE_COMMITMENT_LIFECYCLE_STATUS)[number];

/**
 * Approval state is orthogonal to fulfilment.
 *
 * - NOT_REQUIRED: policy allows proceeding without approver (future policy engine).
 * - PENDING: awaiting decision after submit.
 * - APPROVED / REJECTED: terminal approval outcomes (rejection may co-exist with CANCELLED lifecycle).
 */
export const FINANCE_COMMITMENT_APPROVAL_STATUS = [
  "NOT_REQUIRED",
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

export type FinanceCommitmentApprovalStatus =
  (typeof FINANCE_COMMITMENT_APPROVAL_STATUS)[number];

export const FINANCE_COMMITMENT_LIFECYCLE_SEMANTICS = {
  DRAFT: "Editable obligation draft — not yet submitted for approval.",
  SUBMITTED: "Submitted for organisational review — approval may be pending.",
  ACTIVE:
    "Approved or not-required obligation the organisation treats as committed before settlement evidence.",
  FULFILLED:
    "Organisational obligation satisfied for planning purposes — does not imply accounting recognition.",
  CANCELLED: "Obligation withdrawn — terminal lifecycle state.",
} as const;

export const FINANCE_COMMITMENT_APPROVAL_SEMANTICS = {
  NOT_REQUIRED: "No approver gate for this commitment under current policy (FIN-07D expands policy).",
  PENDING: "Awaiting approver decision — distinct from DRAFT editing.",
  APPROVED: "Approver accepted the obligation — does not execute payment or create Actual.",
  REJECTED: "Approver declined — commitment must not proceed as ACTIVE without rework.",
} as const;

export const FINANCE_COMMITMENT_LIFECYCLE = {
  statuses: FINANCE_COMMITMENT_LIFECYCLE_STATUS,
  allowedTransitions: {
    DRAFT: ["SUBMITTED", "CANCELLED"],
    SUBMITTED: ["ACTIVE", "CANCELLED"],
    ACTIVE: ["FULFILLED", "CANCELLED"],
    FULFILLED: [],
    CANCELLED: [],
  },
  submittedSnapshotImmutableFieldsDeferred: "FIN-07B",
  activeRequiresApprovalApprovedOrNotRequired: true,
} as const;

/** Immutable approval decision records (append-only audit). */
export const FINANCE_COMMITMENT_APPROVAL_DECISION_KIND = ["APPROVED", "REJECTED"] as const;

export type FinanceCommitmentApprovalDecisionKind =
  (typeof FINANCE_COMMITMENT_APPROVAL_DECISION_KIND)[number];

export const FINANCE_COMMITMENT_APPROVAL_ARCHITECTURE = {
  v1NoConfigurableRulesEngine: true,
  futurePolicyDimensions: [
    "amountThreshold",
    "organisationalRole",
    "costCenter",
    "reportingGroup",
    "commitmentType",
    "dimensions",
    "multipleApprovers",
    "sequentialApproval",
    "delegatedApproval",
  ] as const,
  approvalDecisionsAppendOnly: true,
  editDoesNotImplyApprove: true,
  financeBudgetApproveKeySeparateFromCommitmentApprove: true,
} as const;

/** Economic chain — one obligation, many evidence artifacts, one counted exposure. */
export const FINANCE_ECONOMIC_EVIDENCE_KIND = [
  "COMMITMENT",
  "EXPECTED_FINANCIAL_EVENT",
  "SUPPLIER_BILL",
  "ACTUAL",
  "PAYMENT",
  "BANK_TRANSACTION",
  "ACCOUNTING_ENTRY",
] as const;

export type FinanceEconomicEvidenceKind = (typeof FINANCE_ECONOMIC_EVIDENCE_KIND)[number];

export const FINANCE_DOUBLE_COUNTING_INVARIANT = {
  principle:
    "ONE ECONOMIC OBLIGATION MUST NOT BE COUNTED MULTIPLE TIMES MERELY BECAUSE IT HAS MULTIPLE PIECES OF EVIDENCE.",
  obligationChainKeyField: "economicObligationKey",
  evidenceLinkEntity: FINANCE_COMMITMENT_PERSISTENCE_MODEL.economicEvidenceLink,
  uniqueEvidencePerTenant: true,
  exampleChainMinor: 2_000_00,
  exampleInvalidSum: "CHF 10'000 from five CHF 2'000 artifacts without linkage",
  aggregationUsesObligationChainNotRawArtifactSum: true,
  fin07aEstablishesLinkageOnly: true,
  budgetAvailableFormulaDeferred: "FIN-07F — no misleading remaining = budget - actual - commitment in 07A",
} as const;

/** Expected financial event integration (FIN-04E). */
export const FINANCE_COMMITMENT_EXPECTED_EVENT_INTEGRATION = {
  commitmentIsBusinessGovernanceObject: true,
  expectedEventIsTemporalEvidence: true,
  expectedEventModelName: EXPECTED_FINANCIAL_EVENT_CANONICAL_MODEL_NAME,
  fin04eConsumesTimingDoesNotDuplicateCommitmentState: true,
  futureSourceKind: "COMMITMENT",
  futureSourceRefType: "FinanceCommitment",
  manualExpectedEventsRemainSupported: true,
  commitmentTimingUsesExpectedEventTimingPrecision: true,
  noAnnualDivideByTwelve: true,
  timingOnlyDoesNotMutateCurrentForecast: true,
  v1SourceKindsInDb: EXPECTED_FINANCIAL_EVENT_SOURCE_KINDS.v1Required,
  commitmentSourceKindPlannedInSchema: "COMMITMENT enum value reserved — services in FIN-07F+",
} as const;

/** Budget / forecast participation — contract only in 07A. */
export const FINANCE_COMMITMENT_BUDGET_FORECAST_INTEGRATION = {
  budgetNotEqualCommitment: true,
  actualNotEqualCommitment: true,
  forecastNotEqualCommitment: true,
  approvedCommitmentMayInformForecastEvidenceFuture: true,
  silentOverwriteOfApprovedBudgetForbidden: true,
  silentOverwriteOfCurrentForecastForbidden: true,
  doubleCountWithExpectedEventForbidden: true,
  availableMeasureDeferred: "FIN-07F",
} as const;

/** Supplier bill / payable boundary — input evidence, not AP module. */
export const FINANCE_COMMITMENT_SUPPLIER_BILL_BOUNDARY = {
  supplierBillMayCreateCommitment: true,
  supplierBillMayAttachToCommitment: true,
  supplierBillMayRefineAmountOrDates: true,
  supplierBillMayBecomeAccountingEvidenceFuture: true,
  fin07aNoBillIngestion: true,
  fin07eSupplierBillEvidencePackage: "FIN-07E",
} as const;

/** Permission keys — view ≠ edit ≠ submit ≠ approve ≠ policy. */
export const FINANCE_COMMITMENT_PERMISSION_KEYS = {
  view: "finance.commitment.view",
  manage: "finance.commitment.manage",
  submit: "finance.commitment.submit",
  approve: "finance.commitment.approve",
  policyManage: "finance.commitment.policy.manage",
} as const;

export const FINANCE_COMMITMENT_PERMISSION_MODEL = {
  viewDoesNotImplyManage: true,
  manageDoesNotImplySubmit: true,
  manageDoesNotImplyApprove: true,
  submitDoesNotImplyApprove: true,
  approveDoesNotImplyManage: true,
  policyManageSeparateFromApprove: true,
  financeViewRequiredForCommitmentSurfaces: true,
  budgetApproveKey: PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_APPROVE,
  commitmentApproveKey: FINANCE_COMMITMENT_PERMISSION_KEYS.approve,
  serverAuthoritativeChecksRequired: true,
  keys: FINANCE_COMMITMENT_PERMISSION_KEYS,
} as const;

export const FINANCE_COMMITMENT_AUDIT_MODEL = {
  moduleKey: "finance",
  commitmentEntityType: "FinanceCommitment",
  decisionEntityType: "FinanceCommitmentApprovalDecision",
  evidenceLinkEntityType: "FinanceEconomicEvidenceLink",
  auditedActions: [
    "COMMITMENT_CREATED",
    "COMMITMENT_UPDATED",
    "COMMITMENT_SUBMITTED",
    "COMMITMENT_APPROVED",
    "COMMITMENT_REJECTED",
    "COMMITMENT_CANCELLED",
    "COMMITMENT_FULFILLED",
    "EVIDENCE_LINKED",
  ] as const,
  noUnnecessarySensitivePayload: true,
  whoWhatWhenRequired: true,
  approvalDecisionsImmutable: true,
} as const;

export const FINANCE_COMMITMENT_UX_IA = {
  capabilityKey: "COMMITMENTS" as const,
  foundationRoute: "/dashboard/finance/commitments",
  futureWorkspaceRoute: "/dashboard/finance/commitments",
  mainNavDeferredUntil: "FIN-07B",
  interpretationExceptionExplanationEvidence: true,
  futureEmptyStateExplainsCommitment: true,
  noAccountingWorkflowLanguageForClubUsers: true,
  preferredUserTerms: [
    "Commitment",
    "Approval",
    "Amount",
    "Supplier",
    "Due date",
    "Responsible person",
    "Budget impact",
    "Status",
  ] as const,
  forbiddenDefaultUserTerms: ["Debit", "Credit", "Journal", "Ledger", "Posting"],
} as const;

/** FIN-07 package decomposition (07A defines remainder). */
export const FINANCE_07_PACKAGE_PLAN = {
  "07A": "Commitment Domain Foundation & Approval Architecture",
  "07B": "Commitment Workspace & Core Lifecycle",
  "07C": "Approval Inbox & Decision Flow",
  "07D": "Approval Policy & Thresholds",
  "07E": "Supplier Bills / Payables Evidence",
  "07F": "Budget / Forecast Commitment Intelligence",
  "07G": "Governance, Audit & Release Hardening",
} as const;

export const FINANCE_07A_SCOPE = {
  architectureDoc: true,
  architectureContract: true,
  lifecycleAndApprovalEnums: true,
  additivePersistenceFoundation: true,
  provenanceLinkageFoundation: true,
  permissionFoundation: true,
  auditEventFoundation: true,
  expectedEventIntegrationContract: true,
  doubleCountingInvariant: true,
  packageRoadmap: true,
  architectureGuardTests: true,
  minimalFoundationUi: true,
  noFullCommitmentWorkspace: true,
  noApprovalInbox: true,
  noPolicyEngine: true,
  noSupplierBillIngestion: true,
  noBudgetAvailableArithmetic: true,
} as const;

export const FINANCE_07A_IMPLEMENTATION = {
  architectureDoc:
    "docs/finance/SCE-FINANCE-07-COMMITMENTS-APPROVALS-ARCHITECTURE.md",
  architectureContract:
    "lib/finance/commitment/finance-commitment-architecture-contract.ts",
  architectureTestSuite:
    "lib/finance/__tests__/finance-07a-commitment-architecture.test.ts",
  foundationWorkspaceRoute: FINANCE_COMMITMENT_UX_IA.foundationRoute,
  fin07aStatus: "IMPLEMENTED_FOUNDATION_REVIEW",
  fin07ProgrammeStatus: "IN_PROGRESS",
  fin06ProgrammeStatus: "COMPLETE_PO_APPROVED",
} as const;

export const FINANCE_COMMITMENT_SCALE_MODEL = {
  tenantIdFirstClass: true,
  listIndexes: [
    "tenantId + lifecycleStatus",
    "tenantId + approvalStatus",
    "tenantId + financeYearId",
    "tenantId + responsibleUserId",
    "tenantId + expectedPaymentDate",
    "tenantId + economicObligationKey",
  ] as const,
  noFullAuditHistoryOnListQuery: true,
  noNPlusOneUserLookupsInFoundation: true,
} as const;

/** Machine-testable architecture locks (FIN-07A). */
export const SCE_FINANCE_COMMITMENT_ARCHITECTURE_LOCKS = {
  ...FINANCE_COMMITMENT_CONCEPTUAL_LOCK,
  tenantIsolation: true,
  countryAgnosticCore: SCE_FINANCE_PRODUCT_LOCKS.countryAgnosticCore,
  sportAgnostic: SCE_FINANCE_PRODUCT_LOCKS.sportAgnostic,
  noHardcodedChf: true,
  noSwissVatAssumptions: true,
  noFcaSpecificSemantics: SCE_FINANCE_PRODUCT_LOCKS.fcaReferenceIsProductSchema === false,
  integerMinorUnits: FINANCE_AMOUNT_STORAGE.representation === "AMOUNT_MINOR_INTEGER",
  approvalStateSeparateFromLifecycle: true,
  doubleCountingInvariantDocumented: true,
  expectedEventIntegrationWithoutDuplication: true,
  fin09LiquidityDeferred: true,
  fin11AccountingDeferred: true,
  noBinaryCheckboxUiIn07a: true,
} as const;

export const FINANCE_COMMITMENT_DESIGN_SYSTEM = {
  compliance: "PASS",
  consumesSceDesignSystemV1: true,
  binaryControlCompliance: "PASS",
  newBinaryCheckboxes: 0,
  canonicalTogglesUsed: true,
  multiSelectionPattern: "CHECKBOX_WHEN_MULTI_OR_ROW_SELECTION",
} as const;
