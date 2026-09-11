import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findLegalEntityById: vi.fn(),
  findBillingCustomerById: vi.fn(),
  contractNumberExists: vi.fn(),
  createBillingContractRecord: vi.fn(),
  logAction: vi.fn(),
  allocateUniqueBillingKey: vi.fn(),
}));

vi.mock("../native-billing-commercial-repository", () => ({
  contractNumberExists: mocks.contractNumberExists,
  createBillingContractRecord: mocks.createBillingContractRecord,
  findBillingContractByKey: vi.fn(),
  findBillingProductById: vi.fn(),
}));

vi.mock("../native-billing-repository", () => ({
  findLegalEntityById: mocks.findLegalEntityById,
  findBillingCustomerById: mocks.findBillingCustomerById,
  findBillingProfileById: vi.fn(),
}));

vi.mock("../billing-business-key", () => ({
  allocateUniqueBillingKey: mocks.allocateUniqueBillingKey,
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

const { createBillingContract } = await import("../native-billing-commercial-service");

describe("native billing legal entity operator flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findBillingCustomerById.mockResolvedValue({
      id: "bc-1",
      key: "fca-0001",
      displayName: "FC Allschwil",
      status: "ACTIVE",
    });
    mocks.contractNumberExists.mockResolvedValue(false);
    mocks.allocateUniqueBillingKey.mockResolvedValue("contract-key");
    mocks.createBillingContractRecord.mockResolvedValue({ id: "c-1", key: "contract-key" });
    mocks.logAction.mockResolvedValue(undefined);
  });

  it("rejects contract creation when legal entity is inactive", async () => {
    mocks.findLegalEntityById.mockResolvedValue({
      id: "le-inactive",
      key: "old-test",
      displayName: "Test",
      legalName: "Test",
      status: "INACTIVE",
    });

    await expect(
      createBillingContract({
        legalEntityId: "le-inactive",
        billingCustomerId: "bc-1",
        contractNumber: "2026-001",
        productName: "Platform",
        monthlyNetAmountMinor: 19900,
        startDate: "2026-09-10",
        actorUserId: "actor-1",
      }),
    ).rejects.toMatchObject({ name: "NativeBillingValidationError" });

    expect(mocks.createBillingContractRecord).not.toHaveBeenCalled();
  });

  it("allows contract creation for active legal entity", async () => {
    mocks.findLegalEntityById.mockResolvedValue({
      id: "le-active",
      key: "operator",
      displayName: "Operator",
      legalName: "Operator GmbH",
      status: "ACTIVE",
    });

    await createBillingContract({
      legalEntityId: "le-active",
      billingCustomerId: "bc-1",
      contractNumber: "2026-001",
      productName: "Platform",
      monthlyNetAmountMinor: 19900,
      startDate: "2026-09-10",
      actorUserId: "actor-1",
    });

    expect(mocks.createBillingContractRecord).toHaveBeenCalled();
  });
});

describe("legal entity contract selector presentation", () => {
  it("builds human-friendly selector labels without internal keys", async () => {
    const { presentLegalEntityContractSelectorLabel } = await import(
      "../native-billing-presentation"
    );

    expect(
      presentLegalEntityContractSelectorLabel({
        displayName: "SportClubEvo by Tulip Digital",
        legalName: "Tulip Digital - Duijster",
      }),
    ).toBe("SportClubEvo by Tulip Digital — Tulip Digital - Duijster");

    expect(
      presentLegalEntityContractSelectorLabel({
        displayName: "Acme",
        legalName: "Acme",
      }),
    ).toBe("Acme");
  });
});
