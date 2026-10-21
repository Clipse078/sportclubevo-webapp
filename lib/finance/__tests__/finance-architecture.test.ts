import { describe, expect, it } from "vitest";
import {
  allArchetypesPassArchitecture,
  ORGANISATION_ARCHETYPE_VALIDATION,
  validateArchetypeArchitecture,
} from "../finance-archetypes";
import {
  ACCOUNT_HIERARCHY_MODEL,
  APPROVED_BUDGET_VERSION_IMMUTABLE,
  CANONICAL_ACCOUNT_SEMANTICS,
  COST_CENTER_DELETE_INTEGRITY,
  COST_CENTER_HIERARCHY_CAPABILITIES,
  COUNTRY_LOCALIZATION_MODEL,
  FCA_REFERENCE_ROLE,
  FINANCE_CAPABILITY_KEYS,
  FINANCE_DUPLICATE_DOMAIN_ENTITIES,
  FINANCE_IMPLEMENTATION_READINESS,
  FINANCE_MONEY_MODEL,
  FINANCE_UX_MODEL,
  FINANCE_V1_BOUNDARY,
  FINANCIAL_DIMENSION_MODEL,
  isBudgetVersionImmutable,
  OPTIONAL_TEMPLATE_MODEL,
  PERSONNEL_FINANCE_REQUIRES_EXPLICIT_PERMISSION,
  PROPOSED_FINANCE_PERMISSION_KEYS,
  SCE_FINANCE_IS_ORGANISATION_FINANCIAL_OPERATING_SYSTEM,
  SCE_FINANCE_IS_FULL_ACCOUNTING_SYSTEM_V1,
  SCE_FINANCE_PRODUCT_LOCKS,
  SCENARIO_MODEL,
  SEASON_EQUALS_FINANCE_YEAR,
  TAX_LOCALIZATION_MODEL,
  TYPED_FINANCIAL_SEMANTICS,
} from "../finance-architecture";
import { assertSafeAmountMinor } from "../money-types";
import { SCE_FINANCE_DESIGN_SYSTEM_GOVERNANCE } from "../sce-finance-design-system-governance";

describe("SCE Finance FIN-01A-R1 global architecture locks", () => {
  it("is sport-, country-, and organisation-agnostic with tenant configurability", () => {
    expect(SCE_FINANCE_PRODUCT_LOCKS.sportAgnostic).toBe(true);
    expect(SCE_FINANCE_PRODUCT_LOCKS.countryAgnosticCore).toBe(true);
    expect(SCE_FINANCE_PRODUCT_LOCKS.organisationAgnostic).toBe(true);
    expect(SCE_FINANCE_PRODUCT_LOCKS.multiTenantConfigurable).toBe(true);
    expect(SCE_FINANCE_PRODUCT_LOCKS.fcaReferenceIsProductSchema).toBe(false);
    expect(SCE_FINANCE_PRODUCT_LOCKS.footballSpecificFinanceCore).toBe(false);
    expect(SCE_FINANCE_PRODUCT_LOCKS.swissSpecificFinanceCore).toBe(false);
  });

  it("does not require team, org unit, event, or season for finance core", () => {
    expect(SCE_FINANCE_PRODUCT_LOCKS.teamRequiredForFinance).toBe(false);
    expect(SCE_FINANCE_PRODUCT_LOCKS.orgUnitRequiredForFinance).toBe(false);
    expect(SCE_FINANCE_PRODUCT_LOCKS.eventRequiredForFinance).toBe(false);
    expect(SCE_FINANCE_PRODUCT_LOCKS.sportingSeasonRequiredForFinance).toBe(false);
    expect(SEASON_EQUALS_FINANCE_YEAR).toBe(false);
  });

  it("uses canonical financial semantics with configurable organisational labels", () => {
    expect(SCE_FINANCE_PRODUCT_LOCKS.canonicalFinancialSemantics).toBe(true);
    expect(SCE_FINANCE_PRODUCT_LOCKS.configurableOrganisationalSemantics).toBe(true);
    expect(TYPED_FINANCIAL_SEMANTICS.untypedFinancialCore).toBe(false);
    expect(CANONICAL_ACCOUNT_SEMANTICS).toContain("INCOME");
    expect(CANONICAL_ACCOUNT_SEMANTICS).toContain("EXPENSE");
  });
});

describe("SCE Finance FIN-01A-R1 configurable structure", () => {
  it("supports tenant-managed cost center and account hierarchies", () => {
    expect(SCE_FINANCE_PRODUCT_LOCKS.tenantFinanceStructureUserManaged).toBe(true);
    expect(COST_CENTER_HIERARCHY_CAPABILITIES.tenantCanCreateCostCenters).toBe(true);
    expect(COST_CENTER_HIERARCHY_CAPABILITIES.tenantCanReparentCostCenters).toBe(true);
    expect(ACCOUNT_HIERARCHY_MODEL.tenantCanConfigureAccountHierarchy).toBe(true);
    expect(ACCOUNT_HIERARCHY_MODEL.hardcodedAccountStructure).toBe(false);
    expect(COST_CENTER_DELETE_INTEGRITY.silentDelete).toBe(false);
    expect(COST_CENTER_DELETE_INTEGRITY.cascadeFinancialHistoryDelete).toBe(false);
  });

  it("supports user-defined budget scenarios without hardcoded scenario types", () => {
    expect(SCENARIO_MODEL.hardcodedScenarioTypes).toBe(false);
    expect(SCENARIO_MODEL.tenantCanCreateBudgetScenarios).toBe(true);
    expect(SCENARIO_MODEL.tenantCanNameBudgetScenarios).toBe(true);
  });

  it("supports typed and custom dimensions without untyped-only core", () => {
    expect(FINANCIAL_DIMENSION_MODEL.typedDomainDimensionsSupported).toBe(true);
    expect(FINANCIAL_DIMENSION_MODEL.customDimensionsSupported).toBe(true);
    expect(FINANCIAL_DIMENSION_MODEL.everythingIsUntypedCustomField).toBe(false);
    expect(FINANCE_DUPLICATE_DOMAIN_ENTITIES).toBe(false);
  });
});

describe("SCE Finance FIN-01A-R1 UX and internationalization", () => {
  it("uses capability-driven sport-agnostic navigation", () => {
    expect(FINANCE_UX_MODEL.capabilityDrivenFinanceUx).toBe(true);
    expect(FINANCE_UX_MODEL.financeNavigationSportAgnostic).toBe(true);
    expect(FINANCE_UX_MODEL.hardcodedFinanceNavigation).toBe(false);
    expect(FINANCE_CAPABILITY_KEYS.length).toBeGreaterThan(5);
  });

  it("does not require Swiss Erfolgsrechnung globally or hardcode currency", () => {
    expect(FINANCE_V1_BOUNDARY.swissErfolgsrechnungSupported).toBe(true);
    expect(FINANCE_V1_BOUNDARY.swissErfolgsrechnungRequiredGlobally).toBe(false);
    expect(FINANCE_MONEY_MODEL.hardcodedCurrency).toBe(false);
    expect(FINANCE_MONEY_MODEL.floatingPointMoney).toBe(false);
  });

  it("keeps localization out of the core model", () => {
    expect(COUNTRY_LOCALIZATION_MODEL.countryLocalizationContaminatesCoreModel).toBe(
      false,
    );
    expect(TAX_LOCALIZATION_MODEL.taxRulesHardcodedInCore).toBe(false);
    expect(OPTIONAL_TEMPLATE_MODEL.templateBecomesCoreAssumption).toBe(false);
  });
});

describe("SCE Finance FIN-01A-R1 FCA reference isolation", () => {
  it("treats FCA as reference only with workbook analysis pending", () => {
    expect(FCA_REFERENCE_ROLE.fcaReferenceIsProductSchema).toBe(false);
    expect(FCA_REFERENCE_ROLE.fcaWorkbookProgrammaticAnalysis).toBe("PENDING");
    expect(FCA_REFERENCE_ROLE.fcaSpecificAssumptionsRemovedFromCore).toBe(true);
  });
});

describe("SCE Finance organisation archetypes", () => {
  it("passes all eight deliberate organisation archetypes", () => {
    expect(allArchetypesPassArchitecture()).toBe(true);
    for (const archetype of ORGANISATION_ARCHETYPE_VALIDATION) {
      const result = validateArchetypeArchitecture(archetype);
      expect(result.pass, `${archetype.id}: ${result.failures.join(", ")}`).toBe(true);
    }
  });
});

describe("SCE Finance FIN-01A architecture contracts (retained)", () => {
  it("Organisation finance OS boundary excludes full accounting v1", () => {
    expect(SCE_FINANCE_IS_ORGANISATION_FINANCIAL_OPERATING_SYSTEM).toBe(true);
    expect(SCE_FINANCE_IS_FULL_ACCOUNTING_SYSTEM_V1).toBe(false);
    expect(FINANCE_V1_BOUNDARY.balanceSheetAwareArchitecture).toBe(true);
    expect(FINANCE_V1_BOUNDARY.fullGeneralLedgerV1).toBe(false);
  });

  it("Money is not stored as floating point", () => {
    expect(() => assertSafeAmountMinor(100)).not.toThrow();
    expect(() => assertSafeAmountMinor(1.5)).toThrow(/safe integer/);
    expect(() => assertSafeAmountMinor(Number.NaN)).toThrow();
  });

  it("Approved budget versions are immutable in target contract", () => {
    expect(APPROVED_BUDGET_VERSION_IMMUTABLE).toBe(true);
    expect(isBudgetVersionImmutable("DRAFT")).toBe(false);
    expect(isBudgetVersionImmutable("APPROVED")).toBe(true);
    expect(isBudgetVersionImmutable("LOCKED")).toBe(true);
  });

  it("Individual personnel finance requires explicit permission — not people.view", () => {
    expect(PERSONNEL_FINANCE_REQUIRES_EXPLICIT_PERMISSION).toBe(true);
    expect(PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_VIEW).toBe("finance.view");
    expect(PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_STRUCTURE_MANAGE).toBe(
      "finance.structure.manage",
    );
    expect(PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_PERSONNEL_VIEW).toBe(
      "finance.personnel.view",
    );
  });

  it("Finance consumes SCE Design System governance", () => {
    expect(SCE_FINANCE_DESIGN_SYSTEM_GOVERNANCE.compliance).toBe("PASS");
    expect(SCE_FINANCE_DESIGN_SYSTEM_GOVERNANCE.binaryControlCompliance).toBe("PASS");
    expect(SCE_FINANCE_DESIGN_SYSTEM_GOVERNANCE.newBinaryCheckboxes).toBe(0);
    expect(SCE_FINANCE_DESIGN_SYSTEM_GOVERNANCE.canonicalTogglesUsed).toBe(true);
  });

  it("reports consistent implementation readiness after R1 correction", () => {
    expect(FINANCE_IMPLEMENTATION_READINESS.architectureContradictionsRemaining).toBe(
      false,
    );
    expect(FINANCE_IMPLEMENTATION_READINESS.sceFinance01aR1ReadyForPoReview).toBe(true);
    expect(FINANCE_IMPLEMENTATION_READINESS.sceFinance01ArchitectureReadyForImplementation).toBe(
      true,
    );
  });
});
