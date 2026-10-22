/**
 * Organisation archetype architecture validation (FIN-01A-R1).
 *
 * These are architecture tests — not product templates.
 */

import {
  ACCOUNT_HIERARCHY_MODEL,
  COST_CENTER_HIERARCHY_CAPABILITIES,
  FINANCE_UX_MODEL,
  FINANCIAL_DIMENSION_MODEL,
  FINANCIAL_YEAR_CONFIGURABLE,
  FINANCE_MONEY_MODEL,
  SCE_FINANCE_PRODUCT_LOCKS,
  SPORTING_SEASON_OPTIONAL,
} from "./finance-architecture";

export interface OrganisationArchetypeExpectations {
  id: string;
  description: string;
  canConfigureWithoutCodeChange: boolean;
  canConfigureWithoutSchemaChange: boolean;
  teamRequired: boolean;
  seasonRequired: boolean;
  ownCostCenterHierarchySupported: boolean;
  ownAccountHierarchySupported: boolean;
  ownFinancialYearSupported: boolean;
  ownCurrencySupported: boolean;
  customDimensionsSupported: boolean;
  irrelevantCapabilitiesCanBeHidden: boolean;
}

function basePass(description: string): OrganisationArchetypeExpectations {
  return {
    id: description,
    description,
    canConfigureWithoutCodeChange: SCE_FINANCE_PRODUCT_LOCKS.multiTenantConfigurable,
    canConfigureWithoutSchemaChange: SCE_FINANCE_PRODUCT_LOCKS.multiTenantConfigurable,
    teamRequired: SCE_FINANCE_PRODUCT_LOCKS.teamRequiredForFinance,
    seasonRequired: SCE_FINANCE_PRODUCT_LOCKS.sportingSeasonRequiredForFinance,
    ownCostCenterHierarchySupported:
      COST_CENTER_HIERARCHY_CAPABILITIES.tenantCanCreateCostCenters,
    ownAccountHierarchySupported:
      ACCOUNT_HIERARCHY_MODEL.tenantCanConfigureReportingStructure,
    ownFinancialYearSupported: FINANCIAL_YEAR_CONFIGURABLE,
    ownCurrencySupported: FINANCE_MONEY_MODEL.tenantBaseCurrencyConfigurable,
    customDimensionsSupported: FINANCIAL_DIMENSION_MODEL.customDimensionsSupported,
    irrelevantCapabilitiesCanBeHidden: FINANCE_UX_MODEL.capabilityDrivenFinanceUx,
  };
}

export const ORGANISATION_ARCHETYPE_VALIDATION: readonly OrganisationArchetypeExpectations[] =
  [
    basePass("SWISS_SMALL_FOOTBALL"),
    basePass("DUTCH_FIELD_HOCKEY"),
    basePass("GERMAN_MULTI_SPORT"),
    basePass("UK_SWIMMING"),
    basePass("US_YOUTH_BASKETBALL"),
    basePass("TENNIS_INDIVIDUAL_MEMBER"),
    basePass("REGIONAL_FEDERATION"),
    basePass("CAMP_COURSE_EVENT_ORGANISATION"),
  ] as const;

export function validateArchetypeArchitecture(
  archetype: OrganisationArchetypeExpectations,
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!archetype.canConfigureWithoutCodeChange) {
    failures.push("CAN_CONFIGURE_WITHOUT_CODE_CHANGE");
  }
  if (!archetype.canConfigureWithoutSchemaChange) {
    failures.push("CAN_CONFIGURE_WITHOUT_SCHEMA_CHANGE");
  }
  if (archetype.teamRequired) failures.push("TEAM_REQUIRED");
  if (archetype.seasonRequired) failures.push("SEASON_REQUIRED");
  if (!archetype.ownCostCenterHierarchySupported) {
    failures.push("OWN_COST_CENTER_HIERARCHY_SUPPORTED");
  }
  if (!archetype.ownAccountHierarchySupported) {
    failures.push("OWN_ACCOUNT_HIERARCHY_SUPPORTED");
  }
  if (!archetype.ownFinancialYearSupported) failures.push("OWN_FINANCIAL_YEAR_SUPPORTED");
  if (!archetype.ownCurrencySupported) failures.push("OWN_CURRENCY_SUPPORTED");
  if (!archetype.customDimensionsSupported) failures.push("CUSTOM_DIMENSIONS_SUPPORTED");
  if (!archetype.irrelevantCapabilitiesCanBeHidden) {
    failures.push("IRRELEVANT_CAPABILITIES_CAN_BE_HIDDEN");
  }
  if (!SPORTING_SEASON_OPTIONAL && archetype.id.includes("TENNIS")) {
    failures.push("SPORTING_SEASON_OPTIONAL");
  }
  return { pass: failures.length === 0, failures };
}

export function allArchetypesPassArchitecture(): boolean {
  return ORGANISATION_ARCHETYPE_VALIDATION.every(
    (a) => validateArchetypeArchitecture(a).pass,
  );
}
