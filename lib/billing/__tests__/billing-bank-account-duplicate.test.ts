import { beforeEach, describe, expect, it, vi } from "vitest";
import { BILLING_FIELD_CRYPTO_TEST_KEY_BASE64 } from "../billing-field-crypto";
import { encryptBillingField } from "../billing-field-crypto";

const mocks = vi.hoisted(() => ({
  findBillingBankAccountWithFingerprintCollision: vi.fn(),
  listBillingBankAccountsForLegacyDuplicateScan: vi.fn(),
}));

vi.mock("../native-billing-repository", () => ({
  findBillingBankAccountWithFingerprintCollision: mocks.findBillingBankAccountWithFingerprintCollision,
  listBillingBankAccountsForLegacyDuplicateScan: mocks.listBillingBankAccountsForLegacyDuplicateScan,
}));

const { assertBillingBankAccountNotDuplicate, BILLING_BANK_ACCOUNT_DUPLICATE_MESSAGE } =
  await import("../billing-bank-account-duplicate");
const { nativeBillingErrorResponse } = await import("../native-billing-api-errors");

const NORMAL_IBAN = "CH9300762011623852957";
const QR_IBAN = "CH0030049000000000049";

describe("billing bank account duplicate protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SCE_BILLING_ENCRYPTION_KEY = BILLING_FIELD_CRYPTO_TEST_KEY_BASE64;
    mocks.findBillingBankAccountWithFingerprintCollision.mockResolvedValue(null);
    mocks.listBillingBankAccountsForLegacyDuplicateScan.mockResolvedValue([]);
  });

  it("rejects same normalized IBAN for the same legal entity via fingerprint", async () => {
    mocks.findBillingBankAccountWithFingerprintCollision.mockResolvedValue({ id: "existing" });

    await expect(
      assertBillingBankAccountNotDuplicate({
        legalEntityId: "le-1",
        iban: "ch93 0076 2011 6238 5295 7",
        qrIban: QR_IBAN,
      }),
    ).rejects.toMatchObject({
      name: "NativeBillingConflictError",
      message: BILLING_BANK_ACCOUNT_DUPLICATE_MESSAGE,
    });
  });

  it("treats spacing and case differences as duplicate via legacy scan", async () => {
    mocks.listBillingBankAccountsForLegacyDuplicateScan.mockResolvedValue([
      {
        id: "legacy",
        ibanEncrypted: encryptBillingField(NORMAL_IBAN),
        qrIbanEncrypted: encryptBillingField(QR_IBAN),
      },
    ]);

    await expect(
      assertBillingBankAccountNotDuplicate({
        legalEntityId: "le-1",
        iban: "CH93 0076 2011 6238 5295 7",
        qrIban: QR_IBAN,
      }),
    ).rejects.toMatchObject({ name: "NativeBillingConflictError" });
  });

  it("rejects duplicate QR-IBAN for the same legal entity", async () => {
    const otherIban = "CH5604835012345678009";
    mocks.listBillingBankAccountsForLegacyDuplicateScan.mockResolvedValue([
      {
        id: "legacy-qr",
        ibanEncrypted: encryptBillingField(otherIban),
        qrIbanEncrypted: encryptBillingField(QR_IBAN),
      },
    ]);

    await expect(
      assertBillingBankAccountNotDuplicate({
        legalEntityId: "le-1",
        iban: NORMAL_IBAN,
        qrIban: QR_IBAN,
      }),
    ).rejects.toMatchObject({ name: "NativeBillingConflictError" });
  });

  it("does not expose raw identifiers in duplicate API responses", async () => {
    mocks.findBillingBankAccountWithFingerprintCollision.mockResolvedValue({ id: "existing" });

    let caught: unknown;
    try {
      await assertBillingBankAccountNotDuplicate({
        legalEntityId: "le-1",
        iban: NORMAL_IBAN,
        qrIban: null,
      });
    } catch (error) {
      caught = error;
    }

    const response = nativeBillingErrorResponse(caught);
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.error).toBe(BILLING_BANK_ACCOUNT_DUPLICATE_MESSAGE);
    expect(JSON.stringify(body)).not.toContain(NORMAL_IBAN);
  });
});
