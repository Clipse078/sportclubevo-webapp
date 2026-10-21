import { describe, expect, it } from "vitest";
import {
  APPROVED_BUDGET_VERSION_IMMUTABLE,
  FINANCE_CANONICAL_DOMAIN_REFERENCES,
  FINANCE_DUPLICATE_DOMAIN_ENTITIES,
  isBudgetVersionImmutable,
  PERSONNEL_FINANCE_REQUIRES_EXPLICIT_PERMISSION,
  PROPOSED_FINANCE_PERMISSION_KEYS,
  SCE_FINANCE_IS_CLUB_FINANCIAL_OPERATING_SYSTEM,
  SCE_FINANCE_IS_FULL_ACCOUNTING_SYSTEM_V1,
  SEASON_EQUALS_FINANCE_YEAR,
} from "../finance-architecture";
import { assertSafeAmountMinor } from "../money-types";
import { SCE_FINANCE_DESIGN_SYSTEM_GOVERNANCE } from "../sce-finance-design-system-governance";

describe("SCE Finance FIN-01A architecture contracts", () => {
  it("Season and FinanceYear remain distinct concepts", () => {
    expect(SEASON_EQUALS_FINANCE_YEAR).toBe(false);
  });

  it("Finance references canonical domain entities — no duplicate Team/OrgUnit/Person tables", () => {
    expect(FINANCE_DUPLICATE_DOMAIN_ENTITIES).toBe(false);
    expect(FINANCE_CANONICAL_DOMAIN_REFERENCES.team).toBe("Team");
    expect(FINANCE_CANONICAL_DOMAIN_REFERENCES.orgUnit).toBe("OrgUnit");
    expect(FINANCE_CANONICAL_DOMAIN_REFERENCES.person).toBe("Person");
    expect(FINANCE_CANONICAL_DOMAIN_REFERENCES.season).toBe("Season");
  });

  it("Club finance OS boundary excludes full accounting v1", () => {
    expect(SCE_FINANCE_IS_CLUB_FINANCIAL_OPERATING_SYSTEM).toBe(true);
    expect(SCE_FINANCE_IS_FULL_ACCOUNTING_SYSTEM_V1).toBe(false);
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
    expect(PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_PERSONNEL_VIEW).toBe("finance.personnel.view");
  });

  it("Finance consumes SCE Design System governance", () => {
    expect(SCE_FINANCE_DESIGN_SYSTEM_GOVERNANCE.compliance).toBe("PASS");
    expect(SCE_FINANCE_DESIGN_SYSTEM_GOVERNANCE.binaryControlCompliance).toBe("PASS");
    expect(SCE_FINANCE_DESIGN_SYSTEM_GOVERNANCE.newBinaryCheckboxes).toBe(0);
    expect(SCE_FINANCE_DESIGN_SYSTEM_GOVERNANCE.canonicalTogglesUsed).toBe(true);
  });
});
