/**
 * SCE Finance — pure architecture contracts (FIN-01A).
 *
 * No Prisma, React, or persistence. Target model for FIN-01B+ implementation.
 */

import { FINANCE_AMOUNT_STORAGE } from "./money-types";

/** Club operational finance — not statutory accounting (see ADR-016). */
export const SCE_FINANCE_IS_CLUB_FINANCIAL_OPERATING_SYSTEM = true;
export const SCE_FINANCE_IS_FULL_ACCOUNTING_SYSTEM_V1 = false;

export const FINANCE_V1_BOUNDARY = {
  managementPlRequired: true,
  swissErfolgsrechnungRequired: true,
  fullGeneralLedgerV1: false,
  fullBalanceSheetV1: false,
  vatAccountingV1: false,
  payrollAccountingV1: false,
  bankReconciliationV1: false,
  accountingIntegrationArchitectureRequired: true,
} as const;

/** Sporting season and finance year are related, not identical (ADR-018). */
export const SEASON_EQUALS_FINANCE_YEAR = false;

/** Finance references canonical SCE domain rows — no parallel Team/OrgUnit/Person tables. */
export const FINANCE_DUPLICATE_DOMAIN_ENTITIES = false;

export const FINANCE_CANONICAL_DOMAIN_REFERENCES = {
  tenant: "Tenant",
  season: "Season",
  orgUnit: "OrgUnit",
  team: "Team",
  person: "Person",
  clubEvent: "Event (type=OTHER)",
  match: "Event (type=MATCH)",
  tournament: "Event (type=TOURNAMENT)",
  sponsorOrganisation: "SponsorOrganisation",
  facilityResource: "FacilityResource",
  personMembership: "PersonMembership",
  personAssignment: "PersonAssignment",
} as const;

/** Native billing / invoices are commercial counterparty flows — separate product boundary. */
export const CLUB_FINANCE_VS_PLATFORM_BILLING = {
  clubFinanceScope: "Management planning, budgets, Erfolgsrechnung, club intelligence",
  platformBillingScope: "LegalEntity, BillingCustomer, Invoice, Swiss QR — membership/commercial invoicing",
  integrationDirection: "Future export / mapping from club finance actuals to invoice lines — not FIN-01",
} as const;

export const FINANCIAL_MEASURE_KINDS = [
  "BUDGET",
  "ACTUAL",
  "FORECAST",
  "COMMITMENT",
] as const;

export type FinancialMeasureKind = (typeof FINANCIAL_MEASURE_KINDS)[number];

/** Approved baseline budgets are not silently mutable (ADR-019). */
export const BUDGET_VERSION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "LOCKED",
] as const;

export type BudgetVersionStatus = (typeof BUDGET_VERSION_STATUSES)[number];

export const APPROVED_BUDGET_VERSION_IMMUTABLE = true;

export const BUDGET_SCENARIO_KINDS = [
  "BASELINE",
  "SANIERUNG",
  "INVESTITION_JUGEND",
  "CUSTOM",
] as const;

export type BudgetScenarioKind = (typeof BUDGET_SCENARIO_KINDS)[number];

/** P&L / Erfolgsrechnung reporting structure (management, not Swiss OR). */
export const MANAGEMENT_PL_SECTIONS = ["ERTRAG", "AUFWAND"] as const;

export type ManagementPlSection = (typeof MANAGEMENT_PL_SECTIONS)[number];

export const MANAGEMENT_PL_COMPUTED_LINES = [
  "TOTAL_ERTRAG",
  "TOTAL_AUFWAND",
  "BETRIEBSERGEBNIS",
  "JAHRESERGEBNIS",
] as const;

export const VARIANCE_MEASURES = ["ABSOLUTE", "PERCENT"] as const;

/** Typed financial dimensions — one assignment row, one primary entity (ADR-017). */
export const FINANCE_DIMENSION_KINDS = [
  "SEASON",
  "ORG_UNIT",
  "TEAM",
  "PERSON",
  "CLUB_EVENT",
  "TOURNAMENT",
  "MATCH",
  "SPONSOR_ORGANISATION",
  "FINANCE_PROJECT",
  "FACILITY_RESOURCE",
  "FUNDING_SOURCE",
  "FINANCE_COST_CENTER",
] as const;

export type FinanceDimensionKind = (typeof FINANCE_DIMENSION_KINDS)[number];

/**
 * Cost centers may optionally link to domain objects without mirroring the org tree (ADR-020).
 */
export const COST_CENTER_MODEL = {
  entity: "FinanceCostCenter",
  optionalLinks: ["orgUnitId", "teamId", "eventId", "parentCostCenterId"],
  orgTreeIsNotAccountingTree: true,
} as const;

/** Team economics — avoid simplistic profitable/unprofitable labels (product semantics). */
export const TEAM_ECONOMICS_CONCEPTS = [
  "DECKUNGSBEITRAG",
  "ZUSCHUSSBEDARF",
  "SELBSTTRAGEND",
] as const;

export type TeamEconomicsConcept = (typeof TEAM_ECONOMICS_CONCEPTS)[number];

/** Personnel compensation requires explicit finance permissions — not people.view. */
export const PERSONNEL_FINANCE_REQUIRES_EXPLICIT_PERMISSION = true;

export const FINANCE_PERSONNEL_PERMISSION_KEYS = {
  aggregateClub: "finance.view",
  teamAggregate: "finance.view",
  individualCompensation: "people.finance.view",
  manageIndividualCompensation: "people.finance.manage",
} as const;

/** Proposed tenant-scoped finance module permissions (FIN-01B seeds PermissionModule.FINANCE). */
export const PROPOSED_FINANCE_PERMISSION_KEYS = {
  FINANCE_VIEW: "finance.view",
  FINANCE_BUDGET_VIEW: "finance.budget.view",
  FINANCE_BUDGET_MANAGE: "finance.budget.manage",
  FINANCE_ACTUAL_VIEW: "finance.actual.view",
  FINANCE_FORECAST_MANAGE: "finance.forecast.manage",
  FINANCE_PERSONNEL_VIEW: "finance.personnel.view",
  FINANCE_APPROVE: "finance.approve",
  FINANCE_ADMIN: "finance.admin",
} as const;

export const FINANCE_WORKSPACE_ROUTE_V1 = "/dashboard/finance" as const;

export const FINANCE_NAVIGATION_V1 = [
  { key: "overview", label: "Übersicht", href: "/dashboard/finance" },
  { key: "erfolgsrechnung", label: "Erfolgsrechnung", href: "/dashboard/finance/erfolgsrechnung" },
  { key: "budget", label: "Budget", href: "/dashboard/finance/budget" },
  { key: "teams", label: "Teams & Bereiche", href: "/dashboard/finance/teams" },
  { key: "settings", label: "Einstellungen", href: "/dashboard/finance/settings" },
] as const;

export const FINANCE_NAVIGATION_FUTURE = [
  "Forecast",
  "Events",
  "Personal",
  "Verpflichtungen",
  "Liquidität",
  "Rechnungen & Zahlungen",
  "Berichte",
] as const;

export const FINANCE_DESIGN_SYSTEM = {
  compliance: "PASS",
  consumesSceDesignSystemV1: true,
  localFinanceDesignSystem: false,
  binaryControlCompliance: "PASS",
  newBinaryCheckboxes: 0,
  canonicalTogglesUsed: true,
  multiSelectionPattern: "CHECKBOX_WHEN_MULTI_OR_ROW_SELECTION",
} as const;

export const FINANCE_DATA_BOUNDARY = {
  schemaMigrationFin01a: false,
  seedChangeFin01a: false,
  productionFinanceUiFin01a: false,
  tenantIsolation: "All finance rows carry tenantId; dimension FKs must match tenant",
  passwordMutation: false,
} as const;

export const FINANCE_MONEY_MODEL = FINANCE_AMOUNT_STORAGE;

/** Liquidity / cash timing is a future layer — not FIN-01. */
export const LIQUIDITY_LAYER_FUTURE = {
  distinguishesResultFromCash: true,
  fin01Implementation: false,
  futureFields: ["expectedPaymentDate", "actualPaymentDate", "receivable", "payable"],
} as const;

/** Available = Budget - Actual - open Commitments (FIN-04). */
export const COMMITMENT_AVAILABLE_FORMULA =
  "AVAILABLE = BUDGET - ACTUAL - OUTSTANDING_COMMITMENTS" as const;

export interface FinanceDimensionAssignmentContract {
  kind: FinanceDimensionKind;
  /** Exactly one canonical entity id for the kind — enforced in service layer. */
  entityId: string;
}

export interface FinancialPostingContract {
  tenantId: string;
  financeYearId: string;
  accountId: string;
  measure: FinancialMeasureKind;
  amountMinor: number;
  currency: string;
  budgetVersionId?: string;
  scenarioId?: string;
  dimensions: FinanceDimensionAssignmentContract[];
}

export function isBudgetVersionImmutable(status: BudgetVersionStatus): boolean {
  return status === "APPROVED" || status === "LOCKED";
}
