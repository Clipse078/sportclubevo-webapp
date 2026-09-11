import { beforeEach, describe, expect, it, vi } from "vitest";
import { BILLING_FIELD_CRYPTO_TEST_KEY_BASE64, encryptBillingField } from "../billing-field-crypto";

const prismaMock = vi.hoisted(() => ({
  billingCustomer: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  billingCustomerTenant: {
    create: vi.fn(),
  },
  legalEntity: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  billingBankAccount: {
    create: vi.fn(),
    count: vi.fn(),
  },
  billingContract: {
    count: vi.fn(),
  },
  invoice: {
    count: vi.fn(),
  },
  invoiceSequence: {
    count: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

const {
  createBillingCustomerRecord,
  createBillingCustomerTenantLink,
  findLegalEntityByKey,
  listActiveLegalEntities,
  createBillingBankAccountRecord,
  countLegalEntityDependencies,
  deleteLegalEntityRecord,
} = await import("../native-billing-repository");

describe("native billing repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SCE_BILLING_ENCRYPTION_KEY = BILLING_FIELD_CRYPTO_TEST_KEY_BASE64;
  });

  it("enforces unique billing customer key at persistence layer", async () => {
    prismaMock.billingCustomer.create.mockRejectedValue({ code: "P2002" });
    await expect(
      createBillingCustomerRecord({
        key: "duplicate",
        displayName: "Dup",
        legalName: null,
        status: "ACTIVE",
        defaultLanguage: null,
        defaultCurrency: null,
        primaryEmail: null,
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("creates customer tenant link", async () => {
    prismaMock.billingCustomerTenant.create.mockResolvedValue({
      id: "link-1",
      billingCustomerId: "cust-1",
      tenantId: "tenant-1",
      linkRole: null,
      activeFrom: new Date(),
      activeUntil: null,
      createdAt: new Date(),
    });

    const link = await createBillingCustomerTenantLink({
      billingCustomerId: "cust-1",
      tenantId: "tenant-1",
    });

    expect(link.tenantId).toBe("tenant-1");
  });

  it("resolves legal entity by unique key", async () => {
    prismaMock.legalEntity.findUnique.mockResolvedValue({ id: "le-1", key: "issuer" });
    const entity = await findLegalEntityByKey("issuer");
    expect(entity?.key).toBe("issuer");
  });

  it("lists only active legal entities for contract selectors", async () => {
    prismaMock.legalEntity.findMany.mockResolvedValue([{ id: "le-1", key: "active-one" }]);
    await listActiveLegalEntities();
    expect(prismaMock.legalEntity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "ACTIVE" } }),
    );
  });

  it("associates bank account with legal entity", async () => {
    const iban = "CH9300762011623852957";
    const ibanEncrypted = encryptBillingField(iban);
    prismaMock.billingBankAccount.create.mockResolvedValue({
      id: "ba-1",
      legalEntityId: "le-1",
      label: "Main",
      bankName: null,
      currency: "CHF",
      ibanEncrypted,
      qrIbanEncrypted: null,
      encryptionKeyVersion: 1,
      referenceStrategy: "NON",
      qrrReferencePrefix: null,
      creditorName: "Issuer",
      creditorAddressLine1: "Street",
      creditorHouseNumber: null,
      creditorPostalCode: "4000",
      creditorCity: "Basel",
      creditorCountryCode: "CH",
      activeFrom: new Date(),
      activeUntil: null,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const account = await createBillingBankAccountRecord({
      legalEntityId: "le-1",
      label: "Main",
      bankName: null,
      currency: "CHF",
      iban,
      qrIban: null,
      referenceStrategy: "NON",
      qrrReferencePrefix: null,
      creditorName: "Issuer",
      creditorAddressLine1: "Street",
      creditorHouseNumber: null,
      creditorPostalCode: "4000",
      creditorCity: "Basel",
      creditorCountryCode: "CH",
      activeFrom: new Date(),
      activeUntil: null,
      isDefault: false,
    });

    expect(account.legalEntityId).toBe("le-1");
    expect(account.iban).toBe(iban);
    expect(prismaMock.billingBankAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ibanEncrypted: expect.not.stringContaining(iban) }),
      }),
    );
  });

  it("counts legal entity billing dependencies", async () => {
    prismaMock.billingBankAccount.count.mockResolvedValue(1);
    prismaMock.billingContract.count.mockResolvedValue(2);
    prismaMock.invoice.count.mockResolvedValue(3);
    prismaMock.invoiceSequence.count.mockResolvedValue(4);

    const counts = await countLegalEntityDependencies("le-1");

    expect(counts).toEqual({
      billingBankAccounts: 1,
      billingContracts: 2,
      invoices: 3,
      invoiceSequences: 4,
    });
  });

  it("deletes legal entity by id", async () => {
    prismaMock.legalEntity.delete.mockResolvedValue(undefined);
    await deleteLegalEntityRecord("le-1");
    expect(prismaMock.legalEntity.delete).toHaveBeenCalledWith({ where: { id: "le-1" } });
  });
});
