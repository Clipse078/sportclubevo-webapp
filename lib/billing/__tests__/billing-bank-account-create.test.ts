import { beforeEach, describe, expect, it, vi } from "vitest";
import { BILLING_FIELD_CRYPTO_TEST_KEY_BASE64 } from "../billing-field-crypto";

const mocks = vi.hoisted(() => ({
  findLegalEntityByKey: vi.fn(),
  createBillingBankAccountRecord: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("../native-billing-repository", () => ({
  findLegalEntityByKey: mocks.findLegalEntityByKey,
  createBillingBankAccountRecord: mocks.createBillingBankAccountRecord,
  listBillingCustomers: vi.fn(),
  findBillingCustomerByKey: vi.fn(),
  findBillingCustomerById: vi.fn(),
  createBillingCustomerRecord: vi.fn(),
  updateBillingCustomerRecord: vi.fn(),
  listBillingCustomerTenantLinks: vi.fn(),
  findActiveBillingCustomerTenantLink: vi.fn(),
  findActiveBillingCustomerTenantLinkByTenantId: vi.fn(),
  createBillingCustomerTenantLink: vi.fn(),
  reactivateBillingCustomerTenantLink: vi.fn(),
  deactivateBillingCustomerTenantLink: vi.fn(),
  listBillingProfilesForCustomer: vi.fn(),
  createBillingProfileRecord: vi.fn(),
  updateBillingProfileRecord: vi.fn(),
  findBillingProfileById: vi.fn(),
  listLegalEntities: vi.fn(),
  findLegalEntityById: vi.fn(),
  createLegalEntityRecord: vi.fn(),
  updateLegalEntityRecord: vi.fn(),
  listActiveLegalEntities: vi.fn(),
  listAllBillingBankAccounts: vi.fn(),
  findBillingBankAccountById: vi.fn(),
  updateBillingBankAccountRecord: vi.fn(),
  tenantExistsById: vi.fn(),
  findTenantIdByKey: vi.fn(),
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

const { createBillingBankAccount } = await import("../native-billing-service");
const { nativeBillingErrorResponse } = await import("../native-billing-api-errors");
const { serializeBillingBankAccountMasked } = await import("../native-billing-serializers");

const NORMAL_IBAN = "CH9300762011623852957";
const QR_IBAN = "CH0030049000000000049";

describe("billing bank account create (SWISS-01D2 regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SCE_BILLING_ENCRYPTION_KEY = BILLING_FIELD_CRYPTO_TEST_KEY_BASE64;
    mocks.findLegalEntityByKey.mockResolvedValue({
      id: "le-1",
      key: "issuer",
    });
    mocks.createBillingBankAccountRecord.mockImplementation(async (data) => ({
      id: "ba-1",
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    mocks.logAction.mockResolvedValue(undefined);
  });

  it("creates first default account with spaced IBANs, QRR, and blank QRR prefix", async () => {
    const created = await createBillingBankAccount({
      legalEntityKey: "issuer",
      label: "Primary CHF",
      iban: "CH93 0076 2011 6238 5295 7",
      qrIban: QR_IBAN,
      referenceStrategy: "QRR",
      qrrReferencePrefix: "",
      creditorName: "Creditor AG",
      creditorAddressLine1: "Musterstrasse",
      creditorPostalCode: "4000",
      creditorCity: "Basel",
      creditorCountryCode: "ch",
      isDefault: true,
      actorUserId: "actor-1",
    });

    expect(mocks.createBillingBankAccountRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        iban: NORMAL_IBAN,
        qrIban: QR_IBAN,
        referenceStrategy: "QRR",
        qrrReferencePrefix: null,
        isDefault: true,
        creditorCountryCode: "CH",
      }),
    );

    const masked = serializeBillingBankAccountMasked(created);
    expect(masked.ibanMasked).toBe("****2957");
    expect(masked.qrIbanMasked).toBe("****0049");
    expect(JSON.stringify(masked)).not.toContain(NORMAL_IBAN);
    expect(JSON.stringify(masked)).not.toContain(QR_IBAN);
  });

  it("surfaces invalid QR-IBAN checksum as validation error (not internal error)", async () => {
    await expect(
      createBillingBankAccount({
        legalEntityKey: "issuer",
        label: "Bad QR",
        iban: NORMAL_IBAN,
        qrIban: "CH44 3199 0123 0008 8901 2",
        referenceStrategy: "QRR",
        qrrReferencePrefix: null,
        creditorName: "Creditor AG",
        creditorAddressLine1: "Musterstrasse",
        creditorPostalCode: "4000",
        creditorCity: "Basel",
        creditorCountryCode: "CH",
        isDefault: true,
        actorUserId: "actor-1",
      }),
    ).rejects.toMatchObject({
      name: "NativeBillingValidationError",
      message: "IBAN-Prüfziffer ungültig.",
    });

    expect(mocks.createBillingBankAccountRecord).not.toHaveBeenCalled();
  });

  it("maps validation failures to operator-safe API responses", async () => {
    let caught: unknown;
    try {
      await createBillingBankAccount({
        legalEntityKey: "issuer",
        label: "Bad QR",
        iban: NORMAL_IBAN,
        qrIban: "CH44 3199 0123 0008 8901 2",
        referenceStrategy: "QRR",
        qrrReferencePrefix: null,
        creditorName: "Creditor AG",
        creditorAddressLine1: "Musterstrasse",
        creditorPostalCode: "4000",
        creditorCity: "Basel",
        creditorCountryCode: "CH",
        actorUserId: "actor-1",
      });
    } catch (error) {
      caught = error;
    }

    const response = nativeBillingErrorResponse(caught);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "IBAN-Prüfziffer ungültig." });
  });
});
