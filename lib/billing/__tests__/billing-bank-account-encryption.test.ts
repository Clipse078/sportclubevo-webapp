import { beforeEach, describe, expect, it, vi } from "vitest";
import { BILLING_FIELD_CRYPTO_TEST_KEY_BASE64 } from "../billing-field-crypto";

const prismaMock = vi.hoisted(() => ({
  billingBankAccount: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

const { createBillingBankAccountRecord, listAllBillingBankAccounts } = await import(
  "../native-billing-repository"
);

const TEST_ENV = {
  NODE_ENV: "test",
  APP_ENV: "test",
  SCE_BILLING_ENCRYPTION_KEY: BILLING_FIELD_CRYPTO_TEST_KEY_BASE64,
} as NodeJS.ProcessEnv;

describe("billing bank account encryption at persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SCE_BILLING_ENCRYPTION_KEY = BILLING_FIELD_CRYPTO_TEST_KEY_BASE64;
  });

  it("encrypts IBAN and QR-IBAN before persistence", async () => {
    prismaMock.billingBankAccount.create.mockImplementation(async ({ data, select }) => {
      expect(data.ibanEncrypted).toBeTruthy();
      expect(data.ibanEncrypted).not.toBe("CH9300762011623852957");
      expect(data.qrIbanEncrypted).toBeTruthy();
      expect(data.encryptionKeyVersion).toBe(1);
      expect(data).not.toHaveProperty("iban");
      return { id: "ba-1", ...data, createdAt: new Date(), updatedAt: new Date() };
    });

    await createBillingBankAccountRecord({
      legalEntityId: "le-1",
      label: "Main",
      bankName: null,
      currency: "CHF",
      iban: "CH9300762011623852957",
      qrIban: "CH0030049000000000049",
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

    expect(prismaMock.billingBankAccount.create).toHaveBeenCalled();
  });

  it("decrypts on read and never returns ciphertext in domain record used for masking", async () => {
    const { encryptBillingField } = await import("../billing-field-crypto");
    const ibanEncrypted = encryptBillingField("CH9300762011623852957", TEST_ENV);
    prismaMock.billingBankAccount.findMany.mockResolvedValue([
      {
        id: "ba-1",
        legalEntityId: "le-1",
        label: "Main",
        bankName: null,
        currency: "CHF",
        ibanEncrypted,
        qrIbanEncrypted: null,
        encryptionKeyVersion: 1,
        referenceStrategy: "NON",
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
      },
    ]);

    const accounts = await listAllBillingBankAccounts();
    expect(accounts[0]?.iban).toBe("CH9300762011623852957");
    expect(JSON.stringify(accounts[0])).not.toContain(ibanEncrypted);
  });
});
