/**
 * BILLING-AUTO-01C — FCA-like monthly eligibility (deterministic, UTC date-only).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeMonthlyBillingPeriod,
  formatBillingDateOnly,
  parseBillingDateOnly,
  resolveDueBillableMonthlyPeriod,
} from "../billing-period";
import { isRecurringBillingCronAutoDeliverEnabled } from "../recurring-billing-config";

const FCA_START = parseBillingDateOnly("2026-09-01");
const SEP = computeMonthlyBillingPeriod(FCA_START, 0);
const OCT = computeMonthlyBillingPeriod(FCA_START, 1);

function isSeptemberInvoiced(periodStart: Date, periodEnd: Date): boolean {
  return (
    formatBillingDateOnly(periodStart) === formatBillingDateOnly(SEP.periodStart) &&
    formatBillingDateOnly(periodEnd) === formatBillingDateOnly(SEP.periodEnd)
  );
}

describe("FCA monthly eligibility — billing-period (UTC date-only)", () => {
  it("TEST A — 2026-09-14: September invoiced, October NOT_DUE", () => {
    const asOf = parseBillingDateOnly("2026-09-14");
    const result = resolveDueBillableMonthlyPeriod({
      contractStart: FCA_START,
      contractEnd: null,
      asOfDate: asOf,
      isPeriodInvoiced: isSeptemberInvoiced,
    });
    expect(result.kind).toBe("NOT_DUE");
    if (result.kind === "NOT_DUE") {
      expect(formatBillingDateOnly(result.nextPeriod.periodStart)).toBe("2026-10-01");
      expect(formatBillingDateOnly(result.nextPeriod.periodEnd)).toBe("2026-10-31");
    }
  });

  it("TEST B — 2026-09-30: last day before October eligibility", () => {
    const asOf = parseBillingDateOnly("2026-09-30");
    const result = resolveDueBillableMonthlyPeriod({
      contractStart: FCA_START,
      contractEnd: null,
      asOfDate: asOf,
      isPeriodInvoiced: isSeptemberInvoiced,
    });
    expect(result.kind).toBe("NOT_DUE");
  });

  it("TEST C — 2026-10-01: first eligible calendar day (UTC date-only)", () => {
    const asOf = parseBillingDateOnly("2026-10-01");
    const result = resolveDueBillableMonthlyPeriod({
      contractStart: FCA_START,
      contractEnd: null,
      asOfDate: asOf,
      isPeriodInvoiced: isSeptemberInvoiced,
    });
    expect(result.kind).toBe("PERIOD");
    if (result.kind === "PERIOD") {
      expect(formatBillingDateOnly(result.period.periodStart)).toBe("2026-10-01");
      expect(formatBillingDateOnly(result.period.periodEnd)).toBe("2026-10-31");
    }
  });

  it("TEST F — VOID October excluded from isPeriodInvoiced allows PERIOD again", () => {
    const asOf = parseBillingDateOnly("2026-10-01");
    const result = resolveDueBillableMonthlyPeriod({
      contractStart: FCA_START,
      contractEnd: null,
      asOfDate: asOf,
      isPeriodInvoiced: (s, e) => {
        if (isSeptemberInvoiced(s, e)) return true;
        // VOID invoice would not appear in findNonVoidInvoiceForContractPeriod — treat as not invoiced
        return false;
      },
    });
    expect(result.kind).toBe("PERIOD");
  });
});

const mocks = vi.hoisted(() => ({
  listActiveBillingContractsForRecurring: vi.fn(),
  findNonVoidInvoiceForContractPeriod: vi.fn(),
  createBillingRecurringRunRecord: vi.fn(),
  createDraftInvoiceFromContract: vi.fn(),
  finalizeInvoice: vi.fn(),
  createInvoicePaymentInstruction: vi.fn(),
  sendNativeInvoiceEmail: vi.fn(),
  resolveInvoiceRecipientProfileForContract: vi.fn(),
  findLegalEntityById: vi.fn(),
  listBillingBankAccountsForLegalEntity: vi.fn(),
  allocateUniqueBillingKey: vi.fn(),
  logAction: vi.fn(),
  generateNativeInvoicePdfBytes: vi.fn(),
}));

vi.mock("../recurring-billing-repository", () => ({
  listActiveBillingContractsForRecurring: mocks.listActiveBillingContractsForRecurring,
  findNonVoidInvoiceForContractPeriod: mocks.findNonVoidInvoiceForContractPeriod,
  createBillingRecurringRunRecord: mocks.createBillingRecurringRunRecord,
  findLatestBillingRecurringRun: vi.fn(),
}));

vi.mock("@/lib/billing/native-billing-commercial-service", () => ({
  createDraftInvoiceFromContract: mocks.createDraftInvoiceFromContract,
  finalizeInvoice: mocks.finalizeInvoice,
}));

vi.mock("@/lib/billing/invoice-payment-instruction-service", () => ({
  createInvoicePaymentInstruction: mocks.createInvoicePaymentInstruction,
}));

vi.mock("@/lib/billing/invoice-delivery/invoice-delivery-service", () => ({
  sendNativeInvoiceEmail: mocks.sendNativeInvoiceEmail,
}));

vi.mock("@/lib/billing/invoice-recipient-profile-resolution", () => ({
  resolveInvoiceRecipientProfileForContract: mocks.resolveInvoiceRecipientProfileForContract,
}));

vi.mock("@/lib/billing/native-billing-repository", () => ({
  findLegalEntityById: mocks.findLegalEntityById,
  listBillingBankAccountsForLegalEntity: mocks.listBillingBankAccountsForLegalEntity,
}));

vi.mock("@/lib/billing/billing-business-key", () => ({
  allocateUniqueBillingKey: mocks.allocateUniqueBillingKey,
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

vi.mock("@/lib/billing/invoice-pdf-service", () => ({
  generateNativeInvoicePdfBytes: mocks.generateNativeInvoicePdfBytes,
}));

vi.mock("@/lib/billing/swiss-qr/swiss-bank-account-selection", () => ({
  selectEligibleBillingBankAccount: vi.fn(() => ({ id: "bank-1" })),
}));

const baseContract = {
  id: "contract-fca",
  key: "fca-contract",
  contractNumber: "FCA-2026-001",
  legalEntityId: "le-1",
  billingCustomerId: "cust-1",
  billingProductId: null,
  productName: "SportClubEvo Platform",
  productDescription: null,
  status: "ACTIVE" as const,
  currency: "CHF",
  monthlyNetAmountMinor: 19900,
  billingInterval: "MONTHLY" as const,
  vatTreatment: "STANDARD_81" as const,
  startDate: FCA_START,
  endDate: null,
  minimumTermMonths: null,
  paymentTermsDays: 30,
  invoiceRecipientProfileId: "prof-1",
  description: null,
  internalNote: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  customerKey: "fca",
  customerName: "FC Allschwil",
};

function setupHappyPathConfig() {
  mocks.findLegalEntityById.mockResolvedValue({
    id: "le-1",
    status: "ACTIVE",
    legalName: "Tulip Digital AG",
    addressLine1: "Str",
  });
  mocks.resolveInvoiceRecipientProfileForContract.mockResolvedValue({
    companyOrName: "FC Allschwil",
    street: "x",
    postalCode: "4123",
    city: "Allschwil",
    countryCode: "CH",
    invoiceEmail: "finanzen@fcallschwil.ch",
  });
  mocks.listBillingBankAccountsForLegalEntity.mockResolvedValue([
    { id: "ba-1", isDefault: true, ibanEncrypted: "x", referenceStrategy: "QRR" },
  ]);
}

function mockSeptemberInvoicedOnly() {
  mocks.findNonVoidInvoiceForContractPeriod.mockImplementation(
    async ({ periodStart }: { periodStart: Date }) => {
      if (formatBillingDateOnly(periodStart) === "2026-09-01") {
        return {
          key: "inv-fca-sep",
          invoiceNumber: "2026-000002",
          status: "FINALIZED",
          netTotalMinor: 19900,
          vatTotalMinor: 1612,
          grossTotalMinor: 21512,
        };
      }
      return null;
    },
  );
}

const { runRecurringBilling } = await import("../recurring-billing-service");

describe("FCA monthly eligibility — runRecurringBilling DRY_RUN", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listActiveBillingContractsForRecurring.mockResolvedValue([baseContract]);
    setupHappyPathConfig();
    mockSeptemberInvoicedOnly();
  });

  it("TEST A — 2026-09-14: SKIPPED_NOT_DUE for October, zero mutations", async () => {
    const result = await runRecurringBilling({
      mode: "DRY_RUN",
      trigger: "MANUAL",
      asOfDate: "2026-09-14",
      actorUserId: "user-1",
      persistRun: false,
    });
    expect(result.summary.results[0]?.outcome).toBe("SKIPPED_NOT_DUE");
    expect(result.summary.results[0]?.periodStart).toBe("2026-10-01");
    expect(mocks.createDraftInvoiceFromContract).not.toHaveBeenCalled();
    expect(mocks.sendNativeInvoiceEmail).not.toHaveBeenCalled();
  });

  it("TEST B — 2026-09-30: still SKIPPED_NOT_DUE", async () => {
    const result = await runRecurringBilling({
      mode: "DRY_RUN",
      trigger: "MANUAL",
      asOfDate: "2026-09-30",
      actorUserId: "user-1",
      persistRun: false,
    });
    expect(result.summary.results[0]?.outcome).toBe("SKIPPED_NOT_DUE");
  });

  it("TEST C — 2026-10-01: PREVIEW_WOULD_CREATE, zero invoice pipeline calls", async () => {
    const result = await runRecurringBilling({
      mode: "DRY_RUN",
      trigger: "MANUAL",
      asOfDate: "2026-10-01",
      actorUserId: "user-1",
      persistRun: false,
    });
    expect(result.summary.results[0]?.outcome).toBe("PREVIEW_WOULD_CREATE");
    expect(result.summary.results[0]?.periodStart).toBe("2026-10-01");
    expect(result.summary.results[0]?.periodEnd).toBe("2026-10-31");
    expect(mocks.createDraftInvoiceFromContract).not.toHaveBeenCalled();
    expect(mocks.finalizeInvoice).not.toHaveBeenCalled();
    expect(mocks.sendNativeInvoiceEmail).not.toHaveBeenCalled();
  });

  it("TEST D — repeated dry-run on 2026-10-01 stays PREVIEW_WOULD_CREATE", async () => {
    for (let i = 0; i < 3; i += 1) {
      const result = await runRecurringBilling({
        mode: "DRY_RUN",
        trigger: "MANUAL",
        asOfDate: "2026-10-01",
        actorUserId: "user-1",
        persistRun: false,
      });
      expect(result.summary.results[0]?.outcome).toBe("PREVIEW_WOULD_CREATE");
    }
    expect(mocks.createDraftInvoiceFromContract).not.toHaveBeenCalled();
  });

  it("TEST E — existing non-VOID October invoice prevents duplicate October preview", async () => {
    mocks.findNonVoidInvoiceForContractPeriod.mockImplementation(
      async ({ periodStart }: { periodStart: Date }) => {
        const d = formatBillingDateOnly(periodStart);
        if (d === "2026-09-01") {
          return { key: "inv-sep", invoiceNumber: "2026-000002", status: "FINALIZED" };
        }
        if (d === "2026-10-01") {
          return { key: "inv-oct", invoiceNumber: "2026-000003", status: "FINALIZED" };
        }
        return null;
      },
    );
    const result = await runRecurringBilling({
      mode: "DRY_RUN",
      trigger: "MANUAL",
      asOfDate: "2026-10-01",
      actorUserId: "user-1",
      persistRun: false,
    });
    // October is skipped as invoiced; next open period (November) is not yet due on 2026-10-01.
    expect(result.summary.results[0]?.outcome).toBe("SKIPPED_NOT_DUE");
    expect(result.summary.results[0]?.periodStart).toBe("2026-11-01");
    expect(mocks.createDraftInvoiceFromContract).not.toHaveBeenCalled();
  });

  it("TEST E2 — SKIPPED_ALREADY_INVOICED when due period matches existing invoice row", async () => {
    let octoberLookups = 0;
    mocks.findNonVoidInvoiceForContractPeriod.mockImplementation(
      async ({ periodStart }: { periodStart: Date }) => {
        const d = formatBillingDateOnly(periodStart);
        if (d === "2026-09-01") {
          return { key: "inv-sep", invoiceNumber: "2026-000002", status: "FINALIZED" };
        }
        if (d === "2026-10-01") {
          octoberLookups += 1;
          if (octoberLookups === 1) {
            return null;
          }
          return { key: "inv-oct", invoiceNumber: "2026-000003", status: "FINALIZED" };
        }
        return null;
      },
    );
    const result = await runRecurringBilling({
      mode: "DRY_RUN",
      trigger: "MANUAL",
      asOfDate: "2026-10-05",
      actorUserId: "user-1",
      persistRun: false,
    });
    expect(result.summary.results[0]?.outcome).toBe("SKIPPED_ALREADY_INVOICED");
    expect(result.summary.results[0]?.periodStart).toBe("2026-10-01");
  });
});

describe("September duplicate protection — database contract", () => {
  it("migration defines partial unique index excluding VOID", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "prisma/migrations/20260913140000_sce_billing_auto_01_recurring/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("Invoice_billingContractId_period_active_unique");
    expect(sql).toContain(`"status" <> 'VOID'`);
  });
});

describe("cron and delivery gates", () => {
  it("auto-deliver is off unless RECURRING_BILLING_CRON_AUTO_DELIVER=1", () => {
    expect(isRecurringBillingCronAutoDeliverEnabled({})).toBe(false);
    expect(
      isRecurringBillingCronAutoDeliverEnabled({ RECURRING_BILLING_CRON_AUTO_DELIVER: "1" }),
    ).toBe(true);
  });
});
