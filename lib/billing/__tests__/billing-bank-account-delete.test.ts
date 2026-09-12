import { beforeEach, describe, expect, it, vi } from "vitest";
import { BILLING_FIELD_CRYPTO_TEST_KEY_BASE64 } from "../billing-field-crypto";

const mocks = vi.hoisted(() => ({
  findBillingBankAccountById: vi.fn(),
  countBillingBankAccountDependencies: vi.fn(),
  listActiveBillingBankAccountsForLegalEntity: vi.fn(),
  deleteBillingBankAccountRecordWithDefaultRepair: vi.fn(),
  findLegalEntityById: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("../native-billing-repository", () => ({
  findBillingBankAccountById: mocks.findBillingBankAccountById,
  countBillingBankAccountDependencies: mocks.countBillingBankAccountDependencies,
  listActiveBillingBankAccountsForLegalEntity: mocks.listActiveBillingBankAccountsForLegalEntity,
  deleteBillingBankAccountRecordWithDefaultRepair: mocks.deleteBillingBankAccountRecordWithDefaultRepair,
  findLegalEntityById: mocks.findLegalEntityById,
  findLegalEntityByKey: vi.fn(),
  createBillingBankAccountRecord: vi.fn(),
  listAllBillingBankAccounts: vi.fn(),
  updateBillingBankAccountRecord: vi.fn(),
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

const { deleteBillingBankAccount } = await import("../native-billing-service");
const { NATIVE_BILLING_AUDIT_ACTIONS } = await import("../native-billing-audit");
const { nativeBillingErrorResponse } = await import("../native-billing-api-errors");

const NORMAL_IBAN = "CH9300762011623852957";
const QR_IBAN = "CH0030049000000000049";

const baseAccount = {
  id: "ba-delete",
  legalEntityId: "le-1",
  label: "Primary",
  bankName: null,
  currency: "CHF",
  iban: NORMAL_IBAN,
  qrIban: QR_IBAN,
  referenceStrategy: "QRR" as const,
  qrrReferencePrefix: null,
  creditorName: "Creditor",
  creditorAddressLine1: "Street",
  creditorHouseNumber: null,
  creditorPostalCode: "4000",
  creditorCity: "Basel",
  creditorCountryCode: "CH",
  activeFrom: new Date(),
  activeUntil: null,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("deleteBillingBankAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SCE_BILLING_ENCRYPTION_KEY = BILLING_FIELD_CRYPTO_TEST_KEY_BASE64;
    mocks.findBillingBankAccountById.mockResolvedValue(baseAccount);
    mocks.countBillingBankAccountDependencies.mockResolvedValue({ paymentInstructions: 0 });
    mocks.listActiveBillingBankAccountsForLegalEntity.mockResolvedValue([]);
    mocks.deleteBillingBankAccountRecordWithDefaultRepair.mockResolvedValue(undefined);
    mocks.findLegalEntityById.mockResolvedValue({ id: "le-1", key: "issuer" });
    mocks.logAction.mockResolvedValue(undefined);
  });

  it("deletes unused account and audits without sensitive identifiers", async () => {
    await deleteBillingBankAccount({ accountId: "ba-delete", actorUserId: "actor-1" });

    expect(mocks.deleteBillingBankAccountRecordWithDefaultRepair).toHaveBeenCalledWith({
      accountId: "ba-delete",
      promoteDefaultAccountId: null,
    });

    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: NATIVE_BILLING_AUDIT_ACTIONS.BANK_ACCOUNT_DELETED,
        beforeJson: expect.objectContaining({
          id: "ba-delete",
          legalEntityKey: "issuer",
          ibanMasked: "****2957",
          qrIbanMasked: "****0049",
        }),
      }),
    );

    const auditPayload = JSON.stringify(mocks.logAction.mock.calls[0]![0]);
    expect(auditPayload).not.toContain(NORMAL_IBAN);
    expect(auditPayload).not.toContain(QR_IBAN);
  });

  it("blocks deletion when payment instructions exist", async () => {
    mocks.countBillingBankAccountDependencies.mockResolvedValue({ paymentInstructions: 2 });

    await expect(
      deleteBillingBankAccount({ accountId: "ba-delete", actorUserId: "actor-1" }),
    ).rejects.toMatchObject({ name: "NativeBillingConflictError" });

    expect(mocks.deleteBillingBankAccountRecordWithDefaultRepair).not.toHaveBeenCalled();
  });

  it("maps blocked deletion to HTTP 409 with dependency counts", async () => {
    mocks.countBillingBankAccountDependencies.mockResolvedValue({ paymentInstructions: 1 });

    let caught: unknown;
    try {
      await deleteBillingBankAccount({ accountId: "ba-delete", actorUserId: "actor-1" });
    } catch (error) {
      caught = error;
    }

    const response = nativeBillingErrorResponse(caught);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error:
        "Dieses Bankkonto kann nicht gelöscht werden, da es bereits in Zahlungsanweisungen oder anderen Abrechnungsdaten verwendet wird.",
      dependencies: { paymentInstructions: 1 },
    });
  });

  it("promotes the sole remaining active account when deleting the default", async () => {
    mocks.listActiveBillingBankAccountsForLegalEntity.mockResolvedValue([
      { ...baseAccount, id: "ba-remaining", isDefault: false },
    ]);

    await deleteBillingBankAccount({ accountId: "ba-delete", actorUserId: "actor-1" });

    expect(mocks.deleteBillingBankAccountRecordWithDefaultRepair).toHaveBeenCalledWith({
      accountId: "ba-delete",
      promoteDefaultAccountId: "ba-remaining",
    });
  });

  it("blocks deleting a default account when multiple active alternatives remain", async () => {
    mocks.listActiveBillingBankAccountsForLegalEntity.mockResolvedValue([
      { ...baseAccount, id: "ba-2", isDefault: true },
      { ...baseAccount, id: "ba-3", isDefault: false },
    ]);

    await expect(
      deleteBillingBankAccount({ accountId: "ba-delete", actorUserId: "actor-1" }),
    ).rejects.toMatchObject({
      name: "NativeBillingConflictError",
      message:
        "Bitte legen Sie zuerst ein anderes Standardkonto fest, bevor Sie dieses Standardkonto löschen.",
    });
  });
});
