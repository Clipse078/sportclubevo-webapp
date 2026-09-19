import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NativeBillingConflictError,
  NativeBillingValidationError,
} from "../native-billing-types";
import { MailConfigurationError } from "@/lib/email/mailer";
import { SWISS_QR_COMPLIANCE_CODES } from "../swiss-qr-compliance/swiss-qr-compliance-codes";
import {
  buildFixtureIssuer,
  buildFixturePaymentInstruction,
  buildFixtureRecipient,
} from "../invoice-pdf/__tests__/invoice-pdf-fixtures";

const mocks = vi.hoisted(() => ({
  findInvoiceByKey: vi.fn(),
  findInvoiceIssuerSnapshot: vi.fn(),
  findInvoiceRecipientSnapshot: vi.fn(),
  findBillingCustomerById: vi.fn(),
  findBillingBankAccountById: vi.fn(),
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
  recordOutboundInvoiceEmailCommunication: vi.fn(),
}));

vi.mock("../native-billing-commercial-repository", () => ({
  findInvoiceByKey: mocks.findInvoiceByKey,
  findInvoiceIssuerSnapshot: mocks.findInvoiceIssuerSnapshot,
  findInvoiceRecipientSnapshot: mocks.findInvoiceRecipientSnapshot,
}));

vi.mock("../native-billing-repository", () => ({
  findBillingCustomerById: mocks.findBillingCustomerById,
  findBillingBankAccountById: mocks.findBillingBankAccountById,
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
}));

vi.mock("../invoice-delivery/resolve-billing-email-identity", () => ({
  resolveBillingEmailIdentity: mocks.resolveBillingEmailIdentity,
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

vi.mock("../billing-communication/billing-communication-service", () => ({
  recordOutboundInvoiceEmailCommunication: mocks.recordOutboundInvoiceEmailCommunication,
}));

const { validateInvoiceForDelivery, sendNativeInvoiceEmail } = await import(
  "../invoice-delivery/invoice-delivery-service",
);
const { deriveInvoiceDeliveryAggregateStatus } = await import(
  "../invoice-delivery/invoice-delivery-summary",
);

const finalizedInvoice = {
  id: "inv-1",
  key: "inv-key",
  invoiceNumber: "2026-000002",
  legalEntityId: "le-1",
  billingCustomerId: "bc-1",
  billingContractId: null,
  status: "FINALIZED",
  currency: "CHF",
  periodStart: new Date("2026-09-01"),
  periodEnd: new Date("2026-09-30"),
  invoiceDate: new Date("2026-09-01"),
  dueDate: new Date("2026-10-01"),
  paymentTermsDays: 30,
  netTotalMinor: 19900,
  vatTotalMinor: 1612,
  grossTotalMinor: 21512,
  contractLabel: null,
  finalizedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const recipientWithEmail = {
  companyOrName: "FC Example",
  street: "Weg",
  houseNumber: "1",
  postalCode: "4144",
  city: "Arlesheim",
  countryCode: "CH",
  invoiceEmail: "billing@example-club.test",
};

const SWISS_QR_IBAN = "CH9300762011623852957";
const SWISS_QR_QR_IBAN = "CH693000523573415901X";
const SWISS_QR_QRR_REF = "273282026000002025434650072";

const swissQrRecipientWithEmail = {
  ...buildFixtureRecipient(),
  invoiceEmail: "billing@example-club.test",
};

function mockDeterministicSwissQrBankAccount(overrides: { qrIban?: string | null } = {}) {
  mocks.findBillingBankAccountById.mockResolvedValue({
    id: "bba-swiss-qr",
    legalEntityId: finalizedInvoice.legalEntityId,
    iban: SWISS_QR_IBAN,
    qrIban: overrides.qrIban === undefined ? SWISS_QR_QR_IBAN : overrides.qrIban,
    referenceStrategy: "QRR",
    qrrReferencePrefix: null,
    currency: "CHF",
    isDefault: true,
    status: "ACTIVE",
  });
}

function mockDeterministicSwissQrPaymentPath(options: {
  bankAccount?: { qrIban?: string | null };
  paymentInstruction?: ReturnType<typeof buildFixturePaymentInstruction>;
} = {}) {
  mocks.findInvoiceIssuerSnapshot.mockResolvedValue(buildFixtureIssuer());
  mocks.findInvoiceRecipientSnapshot.mockResolvedValue(swissQrRecipientWithEmail);
  mocks.getInvoicePaymentInstruction.mockResolvedValue(
    options.paymentInstruction ??
      buildFixturePaymentInstruction({
        invoiceId: finalizedInvoice.id,
        amountMinor: finalizedInvoice.grossTotalMinor,
        billingBankAccountId: "bba-swiss-qr",
      }),
  );
  mockDeterministicSwissQrBankAccount(options.bankAccount ?? {});
}

function deliveryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "del-1",
    key: "del-key",
    invoiceId: "inv-1",
    channel: "EMAIL" as const,
    recipientEmail: "billing@example-club.test",
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

describe("invoice delivery service", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("NODE_ENV", "production");
    vi.clearAllMocks();
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
    mocks.generateNativeInvoicePdfBytes.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
    mocks.resolveBillingEmailIdentity.mockResolvedValue({
      from: "SportClubEvo Billing <noreply@mail.sportclubevo.com>",
      replyTo: "billing@sportclubevo.com",
    });
    mocks.sendBillingEmail.mockResolvedValue({
      provider: "resend",
      messageId: "msg-123",
      from: "SportClubEvo Billing <noreply@mail.sportclubevo.com>",
      acceptedRecipients: ["billing@example-club.test"],
    });
    mocks.markInvoiceDeliverySent.mockImplementation(async (input) =>
      deliveryRow({
        id: input.deliveryId,
        status: "SENT",
        sentAt: new Date(),
        provider: input.provider,
        providerMessageId: input.providerMessageId,
        attachmentFilename: input.attachmentFilename,
      }),
    );
    mocks.markInvoiceDeliveryFailed.mockImplementation(async (input) =>
      deliveryRow({
        id: input.deliveryId,
        status: "FAILED",
        failedAt: new Date(),
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
      }),
    );
    mocks.recordOutboundInvoiceEmailCommunication.mockResolvedValue({
      id: "comm-1",
      status: "SENT",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("cannot send DRAFT invoice", async () => {
    mocks.findInvoiceByKey.mockResolvedValue({ ...finalizedInvoice, status: "DRAFT" });
    await expect(validateInvoiceForDelivery("inv-key")).rejects.toBeInstanceOf(
      NativeBillingValidationError,
    );
  });

  it("missing invoiceEmail blocks send", async () => {
    mocks.findInvoiceRecipientSnapshot.mockResolvedValue({
      ...recipientWithEmail,
      invoiceEmail: null,
    });
    await expect(validateInvoiceForDelivery("inv-key")).rejects.toThrow(
      "keine Rechnungs-E-Mail",
    );
  });

  it("successful provider response marks SENT with attachment", async () => {
    mocks.listInvoiceDeliveriesForInvoiceId
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([deliveryRow({ status: "SENT", attemptNumber: 1 })]);

    const result = await sendNativeInvoiceEmail({
      invoiceKey: "inv-key",
      actorUserId: "user-1",
      resend: false,
    });

    expect(result.delivery.status).toBe("SENT");
    expect(mocks.sendBillingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "billing@example-club.test",
        deliveryIntent: "normal",
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: "SportClubEvo-Rechnung-2026-000002.pdf",
            contentType: "application/pdf",
          }),
        ]),
      }),
    );
    const sendPayload = mocks.sendBillingEmail.mock.calls[0]?.[0] as {
      attachments?: Array<{ filename?: string; contentType?: string }>;
    };
    expect(sendPayload.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filename: "SportClubEvo-Rechnung-2026-000002.pdf",
          contentType: "application/pdf",
        }),
      ]),
    );
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "INVOICE_DELIVERY_SENT" }),
    );
    expect(mocks.recordOutboundInvoiceEmailCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: expect.objectContaining({ providerMessageId: "msg-123" }),
      }),
    );
  });

  it("provider failure results in failure audit", async () => {
    mocks.sendBillingEmail.mockRejectedValue(new MailConfigurationError("missing key"));
    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toThrow("nicht konfiguriert");
    expect(mocks.markInvoiceDeliveryFailed).toHaveBeenCalled();
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "INVOICE_DELIVERY_FAILED" }),
    );
    expect(mocks.recordOutboundInvoiceEmailCommunication).not.toHaveBeenCalled();
  });

  it("PDF failure results in failure", async () => {
    mocks.generateNativeInvoicePdfBytes.mockResolvedValue(new Uint8Array());
    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);
    expect(mocks.markInvoiceDeliveryFailed).toHaveBeenCalled();
  });

  it("resend creates new attempt when resend flag set", async () => {
    mocks.listInvoiceDeliveriesForInvoiceId
      .mockResolvedValueOnce([
        deliveryRow({ status: "SENT", attemptNumber: 1, key: "old" }),
      ])
      .mockResolvedValueOnce([
        deliveryRow({ status: "SENT", attemptNumber: 2, key: "new" }),
      ]);
    mocks.getNextAttemptNumber.mockResolvedValue(2);
    mocks.createInvoiceDeliverySendingAttempt.mockImplementation(async (input) =>
      deliveryRow({ key: input.key, attemptNumber: 2 }),
    );

    await sendNativeInvoiceEmail({
      invoiceKey: "inv-key",
      actorUserId: "user-1",
      resend: true,
    });

    expect(mocks.createInvoiceDeliverySendingAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ attemptNumber: 2 }),
    );
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "INVOICE_DELIVERY_RESENT" }),
    );
  });

  it("blocks duplicate send without resend flag", async () => {
    mocks.listInvoiceDeliveriesForInvoiceId.mockResolvedValue([
      deliveryRow({ status: "SENT", attemptNumber: 1 }),
    ]);
    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toBeInstanceOf(NativeBillingConflictError);
    expect(mocks.sendBillingEmail).not.toHaveBeenCalled();
  });

  it("blocks concurrent sending", async () => {
    mocks.hasInvoiceDeliveryInSending.mockResolvedValue(true);
    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toBeInstanceOf(NativeBillingConflictError);
  });

  it("derives aggregate status without FCA hardcoding", () => {
    expect(
      deriveInvoiceDeliveryAggregateStatus([
        deliveryRow({ status: "FAILED", attemptNumber: 2 }),
        deliveryRow({ status: "SENT", attemptNumber: 1 }),
      ]),
    ).toBe("FAILED");
  });

  it("blocks Swiss QR invoice delivery before transport when compliance fails (fail-closed)", async () => {
    mockDeterministicSwissQrPaymentPath({
      bankAccount: { qrIban: null },
      paymentInstruction: buildFixturePaymentInstruction({
        invoiceId: finalizedInvoice.id,
        amountMinor: finalizedInvoice.grossTotalMinor,
        billingBankAccountId: "bba-swiss-qr",
        referenceType: "QRR",
        reference: SWISS_QR_QRR_REF,
      }),
    });

    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toMatchObject({
      name: "SwissQrComplianceBlockedError",
      code: SWISS_QR_COMPLIANCE_CODES.INVALID_REFERENCE_COMBINATION,
    });

    expect(mocks.createInvoiceDeliverySendingAttempt).not.toHaveBeenCalled();
    expect(mocks.sendBillingEmail).not.toHaveBeenCalled();
    expect(mocks.markInvoiceDeliverySent).not.toHaveBeenCalled();
    expect(mocks.markInvoiceDeliveryFailed).not.toHaveBeenCalled();
    expect(mocks.recordOutboundInvoiceEmailCommunication).not.toHaveBeenCalled();
    expect(mocks.logAction).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "INVOICE_DELIVERY_SENT" }),
    );
  });

  it("reaches mocked transport for valid deterministic Swiss QR payment instruction", async () => {
    mockDeterministicSwissQrPaymentPath();
    mocks.listInvoiceDeliveriesForInvoiceId
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([deliveryRow({ status: "SENT", attemptNumber: 1 })]);

    const result = await sendNativeInvoiceEmail({
      invoiceKey: "inv-key",
      actorUserId: "user-1",
      resend: false,
    });

    expect(result.delivery.status).toBe("SENT");
    expect(mocks.findInvoiceIssuerSnapshot).toHaveBeenCalled();
    expect(mocks.findBillingBankAccountById).toHaveBeenCalledWith("bba-swiss-qr");
    expect(mocks.createInvoiceDeliverySendingAttempt).toHaveBeenCalled();
    expect(mocks.sendBillingEmail).toHaveBeenCalled();
  });
});
