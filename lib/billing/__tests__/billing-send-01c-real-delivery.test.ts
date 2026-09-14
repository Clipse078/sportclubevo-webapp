import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NativeBillingConflictError,
  NativeBillingValidationError,
} from "../native-billing-types";

const mocks = vi.hoisted(() => ({
  findInvoiceByKey: vi.fn(),
  findInvoiceRecipientSnapshot: vi.fn(),
  findBillingCustomerById: vi.fn(),
  getInvoicePaymentInstruction: vi.fn(),
  listInvoiceDeliveriesForInvoiceId: vi.fn(),
  getNextAttemptNumber: vi.fn(),
  hasInvoiceDeliveryInSending: vi.fn(),
  createInvoiceDeliverySendingAttempt: vi.fn(),
  markInvoiceDeliverySent: vi.fn(),
  markInvoiceDeliveryFailed: vi.fn(),
  generateNativeInvoicePdfBytes: vi.fn(),
  sendBillingEmail: vi.fn(),
  resolveBillingEmailIdentity: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("../native-billing-commercial-repository", () => ({
  findInvoiceByKey: mocks.findInvoiceByKey,
  findInvoiceRecipientSnapshot: mocks.findInvoiceRecipientSnapshot,
}));

vi.mock("../native-billing-repository", () => ({
  findBillingCustomerById: mocks.findBillingCustomerById,
}));

vi.mock("../invoice-payment-instruction-service", () => ({
  getInvoicePaymentInstruction: mocks.getInvoicePaymentInstruction,
}));

vi.mock("../invoice-delivery/invoice-delivery-repository", () => ({
  listInvoiceDeliveriesForInvoiceId: mocks.listInvoiceDeliveriesForInvoiceId,
  getNextAttemptNumber: mocks.getNextAttemptNumber,
  hasInvoiceDeliveryInSending: mocks.hasInvoiceDeliveryInSending,
  createInvoiceDeliverySendingAttempt: mocks.createInvoiceDeliverySendingAttempt,
  markInvoiceDeliverySent: mocks.markInvoiceDeliverySent,
  markInvoiceDeliveryFailed: mocks.markInvoiceDeliveryFailed,
}));

vi.mock("../invoice-pdf-service", () => ({
  generateNativeInvoicePdfBytes: mocks.generateNativeInvoicePdfBytes,
}));

vi.mock("../invoice-delivery/billing-email-transport", () => ({
  sendBillingEmail: mocks.sendBillingEmail,
  BillingEmailDryRunFailureError: class BillingEmailDryRunFailureError extends Error {},
}));

vi.mock("../invoice-delivery/resolve-billing-email-identity", () => ({
  resolveBillingEmailIdentity: mocks.resolveBillingEmailIdentity,
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

const finalizedInvoice = {
  id: "inv-fca",
  key: "inv-key-fca",
  invoiceNumber: "2026-000002",
  legalEntityId: "le-1",
  billingCustomerId: "bc-fca",
  billingContractId: null,
  status: "FINALIZED",
  currency: "CHF",
  periodStart: new Date("2026-09-01"),
  periodEnd: new Date("2026-09-30"),
  invoiceDate: new Date("2026-09-01"),
  dueDate: new Date("2026-10-01"),
  grossTotalMinor: 10000,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const recipientWithEmail = {
  companyOrName: "FC Allschwil",
  street: "Weg",
  houseNumber: "1",
  postalCode: "4123",
  city: "Allschwil",
  countryCode: "CH",
  invoiceEmail: "finanzen@fcallschwil.ch",
};

function deliveryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "del-1",
    key: "del-key",
    invoiceId: "inv-fca",
    channel: "EMAIL" as const,
    recipientEmail: "finanzen@fcallschwil.ch",
    status: "SENDING" as const,
    attemptNumber: 1,
    sentAt: null,
    failedAt: null,
    provider: null,
    providerMessageId: null,
    errorCode: null,
    errorMessage: null,
    subjectSnapshot: null,
    fromAddressSnapshot: null,
    replyToSnapshot: null,
    attachmentFilename: null,
    createdByUserId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("BILLING-SEND-01C real invoice delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.findInvoiceByKey.mockResolvedValue(finalizedInvoice);
    mocks.findInvoiceRecipientSnapshot.mockResolvedValue(recipientWithEmail);
    mocks.getInvoicePaymentInstruction.mockResolvedValue({ id: "pi-1" });
    mocks.findBillingCustomerById.mockResolvedValue({ defaultLanguage: "de" });
    mocks.listInvoiceDeliveriesForInvoiceId.mockResolvedValue([]);
    mocks.hasInvoiceDeliveryInSending.mockResolvedValue(false);
    mocks.getNextAttemptNumber.mockResolvedValue(1);
    mocks.createInvoiceDeliverySendingAttempt.mockImplementation(async (input) =>
      deliveryRow({
        key: input.key,
        attemptNumber: input.attemptNumber,
        recipientEmail: input.recipientEmail,
      }),
    );
    mocks.generateNativeInvoicePdfBytes.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mocks.resolveBillingEmailIdentity.mockResolvedValue({
      from: "SportClubEvo Billing <billing@sportclubevo.com>",
      replyTo: "billing@sportclubevo.com",
    });
    mocks.markInvoiceDeliveryFailed.mockImplementation(async (input) =>
      deliveryRow({
        id: input.deliveryId,
        status: "FAILED",
        failedAt: new Date(),
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
      }),
    );
    mocks.markInvoiceDeliverySent.mockImplementation(async (input) =>
      deliveryRow({
        id: input.deliveryId,
        status: "SENT",
        sentAt: new Date(),
        provider: input.provider,
        providerMessageId: input.providerMessageId,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("A: real provider acceptance marks invoice SENT", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("NODE_ENV", "production");

    mocks.sendBillingEmail.mockResolvedValue({
      provider: "infomaniak-smtp",
      messageId: "<smtp-accepted>",
      from: "SportClubEvo Billing <billing@sportclubevo.com>",
      acceptedRecipients: ["finanzen@fcallschwil.ch"],
      rejectedRecipients: [],
    });

    const { sendNativeInvoiceEmail } = await import(
      "../invoice-delivery/invoice-delivery-service"
    );

    const result = await sendNativeInvoiceEmail({
      invoiceKey: "inv-key-fca",
      actorUserId: "user-1",
      resend: false,
    });

    expect(result.delivery.status).toBe("SENT");
    expect(mocks.markInvoiceDeliverySent).toHaveBeenCalledTimes(1);
    expect(mocks.markInvoiceDeliveryFailed).not.toHaveBeenCalled();
    expect(mocks.sendBillingEmail).toHaveBeenCalledTimes(1);
  });

  it("B: dry-run transport result does not mark invoice SENT", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("NODE_ENV", "production");

    mocks.sendBillingEmail.mockResolvedValue({
      provider: "dry-run",
      messageId: "dry-run-invoice-delivery:del-key",
      from: "SportClubEvo Billing <dry-run@sportclubevo.test>",
    });

    const { sendNativeInvoiceEmail } = await import(
      "../invoice-delivery/invoice-delivery-service"
    );

    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key-fca",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);

    expect(mocks.markInvoiceDeliverySent).not.toHaveBeenCalled();
    expect(mocks.markInvoiceDeliveryFailed).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "DELIVERY_DRY_RUN" }),
    );
  });

  it("B2: preview dry-run runtime blocks send before provider call", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");

    const { sendNativeInvoiceEmail } = await import(
      "../invoice-delivery/invoice-delivery-service"
    );

    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key-fca",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);

    expect(mocks.createInvoiceDeliverySendingAttempt).not.toHaveBeenCalled();
    expect(mocks.sendBillingEmail).not.toHaveBeenCalled();
  });

  it("C: provider failure does not mark invoice SENT", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("NODE_ENV", "production");

    mocks.sendBillingEmail.mockRejectedValue(new Error("smtp down"));

    const { sendNativeInvoiceEmail } = await import(
      "../invoice-delivery/invoice-delivery-service"
    );

    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key-fca",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);

    expect(mocks.markInvoiceDeliverySent).not.toHaveBeenCalled();
    expect(mocks.markInvoiceDeliveryFailed).toHaveBeenCalled();
  });

  it("D: recipient not accepted by provider does not mark invoice SENT", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("NODE_ENV", "production");

    mocks.sendBillingEmail.mockResolvedValue({
      provider: "infomaniak-smtp",
      messageId: "<smtp-1>",
      from: "SportClubEvo Billing <billing@sportclubevo.com>",
      acceptedRecipients: ["other@example.com"],
      rejectedRecipients: [],
    });

    const { sendNativeInvoiceEmail } = await import(
      "../invoice-delivery/invoice-delivery-service"
    );

    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key-fca",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);

    expect(mocks.markInvoiceDeliverySent).not.toHaveBeenCalled();
    expect(mocks.markInvoiceDeliveryFailed).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "DELIVERY_RECIPIENT_NOT_ACCEPTED" }),
    );
  });

  it("F: duplicate send without resend remains blocked", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("NODE_ENV", "production");

    mocks.listInvoiceDeliveriesForInvoiceId.mockResolvedValue([
      deliveryRow({ status: "SENT", attemptNumber: 1 }),
    ]);

    const { sendNativeInvoiceEmail } = await import(
      "../invoice-delivery/invoice-delivery-service"
    );

    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key-fca",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toBeInstanceOf(NativeBillingConflictError);

    expect(mocks.sendBillingEmail).not.toHaveBeenCalled();
  });
});
