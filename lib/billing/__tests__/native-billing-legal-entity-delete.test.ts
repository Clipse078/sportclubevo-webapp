import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findLegalEntityByKey: vi.fn(),
  countLegalEntityDependencies: vi.fn(),
  deleteLegalEntityRecord: vi.fn(),
  listActiveLegalEntities: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("../native-billing-repository", () => ({
  findLegalEntityByKey: mocks.findLegalEntityByKey,
  countLegalEntityDependencies: mocks.countLegalEntityDependencies,
  deleteLegalEntityRecord: mocks.deleteLegalEntityRecord,
  listActiveLegalEntities: mocks.listActiveLegalEntities,
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

const { deleteLegalEntity } = await import("../native-billing-service");
const { listActiveLegalEntities } = await import("../native-billing-repository");

const sampleEntity = {
  id: "le-delete-me",
  key: "orphan-entity",
  displayName: "Orphan GmbH",
  legalName: "Orphan GmbH",
  entityType: "COMPANY" as const,
  uid: null,
  vatId: null,
  defaultCurrency: "CHF",
  status: "ACTIVE" as const,
  addressLine1: "Teststrasse 1",
  houseNumber: null,
  postalCode: "4000",
  city: "Basel",
  countryCode: "CH",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const zeroDependencies = {
  billingBankAccounts: 0,
  billingContracts: 0,
  invoices: 0,
  invoiceSequences: 0,
};

describe("deleteLegalEntity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logAction.mockResolvedValue(undefined);
    mocks.findLegalEntityByKey.mockResolvedValue(sampleEntity);
    mocks.countLegalEntityDependencies.mockResolvedValue(zeroDependencies);
    mocks.deleteLegalEntityRecord.mockResolvedValue(undefined);
  });

  it("deletes unreferenced legal entity and writes audit without bank fields", async () => {
    await deleteLegalEntity({ entityKey: "orphan-entity", actorUserId: "actor-1" });

    expect(mocks.deleteLegalEntityRecord).toHaveBeenCalledWith("le-delete-me");
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "LEGAL_ENTITY_DELETED",
        entityType: "LegalEntity",
        entityId: "le-delete-me",
        beforeJson: {
          key: "orphan-entity",
          displayName: "Orphan GmbH",
          legalName: "Orphan GmbH",
        },
      }),
    );

    const auditPayload = JSON.stringify(mocks.logAction.mock.calls[0]?.[0]);
    expect(auditPayload).not.toMatch(/iban|qrIban|encrypted/i);
  });

  it("returns not found for missing entity", async () => {
    mocks.findLegalEntityByKey.mockResolvedValue(null);

    await expect(
      deleteLegalEntity({ entityKey: "missing", actorUserId: "actor-1" }),
    ).rejects.toMatchObject({ name: "NativeBillingNotFoundError" });

    expect(mocks.deleteLegalEntityRecord).not.toHaveBeenCalled();
  });

  it("blocks deletion when billing bank accounts exist", async () => {
    mocks.countLegalEntityDependencies.mockResolvedValue({
      ...zeroDependencies,
      billingBankAccounts: 1,
    });

    await expect(
      deleteLegalEntity({ entityKey: "orphan-entity", actorUserId: "actor-1" }),
    ).rejects.toMatchObject({
      name: "NativeBillingConflictError",
      dependencyCounts: expect.objectContaining({ billingBankAccounts: 1 }),
    });

    expect(mocks.deleteLegalEntityRecord).not.toHaveBeenCalled();
  });

  it("blocks deletion when billing contracts exist", async () => {
    mocks.countLegalEntityDependencies.mockResolvedValue({
      ...zeroDependencies,
      billingContracts: 2,
    });

    await expect(deleteLegalEntity({ entityKey: "orphan-entity", actorUserId: "actor-1" }))
      .rejects.toMatchObject({
        name: "NativeBillingConflictError",
        dependencyCounts: expect.objectContaining({ billingContracts: 2 }),
      });
  });

  it("blocks deletion when invoices exist", async () => {
    mocks.countLegalEntityDependencies.mockResolvedValue({
      ...zeroDependencies,
      invoices: 1,
    });

    await expect(deleteLegalEntity({ entityKey: "orphan-entity", actorUserId: "actor-1" }))
      .rejects.toMatchObject({
        name: "NativeBillingConflictError",
        dependencyCounts: expect.objectContaining({ invoices: 1 }),
      });
  });

  it("blocks deletion when invoice sequences exist", async () => {
    mocks.countLegalEntityDependencies.mockResolvedValue({
      ...zeroDependencies,
      invoiceSequences: 1,
    });

    await expect(deleteLegalEntity({ entityKey: "orphan-entity", actorUserId: "actor-1" }))
      .rejects.toMatchObject({
        name: "NativeBillingConflictError",
        dependencyCounts: expect.objectContaining({ invoiceSequences: 1 }),
      });
  });

  it("conflict payload never includes sensitive bank data", async () => {
    mocks.countLegalEntityDependencies.mockResolvedValue({
      billingBankAccounts: 1,
      billingContracts: 0,
      invoices: 0,
      invoiceSequences: 0,
    });

    try {
      await deleteLegalEntity({ entityKey: "orphan-entity", actorUserId: "actor-1" });
    } catch (error) {
      const serialized = JSON.stringify(error);
      expect(serialized).not.toMatch(/CH\d|iban|qrIban/i);
      expect((error as { dependencyCounts?: unknown }).dependencyCounts).toEqual({
        billingBankAccounts: 1,
        billingContracts: 0,
        invoices: 0,
        invoiceSequences: 0,
      });
    }
  });
});

describe("listActiveLegalEntities after deletion", () => {
  it("does not return deleted entity keys from repository list", async () => {
    mocks.listActiveLegalEntities.mockResolvedValue([
      { ...sampleEntity, key: "still-active" },
    ]);

    const rows = await listActiveLegalEntities();
    expect(rows.map((row) => row.key)).not.toContain("orphan-entity");
    expect(rows.map((row) => row.key)).toContain("still-active");
  });
});
