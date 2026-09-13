import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildBillingAttentionQueue } from "../operations/billing-operations-attention";
import {
  applyFcaRecipientProfileLinkage,
  FCA_CANONICAL_RECIPIENT_SPEC,
  invoiceIntegritySnapshotsEqual,
  recipientProfileMatchesCanonical,
  selectCanonicalRecipientProfile,
} from "../sce-billing-fca-01-recipient-profile-linkage";
import type { BillingProfileRecord } from "../native-billing-types";

const linkageMocks = vi.hoisted(() => ({
  createBillingProfile: vi.fn(),
  updateBillingContract: vi.fn(),
  resolveInvoiceRecipientProfileForContract: vi.fn(),
}));

vi.mock("../native-billing-service", () => ({
  createBillingProfile: linkageMocks.createBillingProfile,
}));

vi.mock("../native-billing-commercial-service", () => ({
  updateBillingContract: linkageMocks.updateBillingContract,
}));

vi.mock("../invoice-recipient-profile-resolution", () => ({
  resolveInvoiceRecipientProfileForContract:
    linkageMocks.resolveInvoiceRecipientProfileForContract,
}));

const invoiceSnapshot = {
  invoiceNumber: "2026-000002",
  status: "FINALIZED",
  invoiceDate: "2026-09-01",
  dueDate: "2026-10-01",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  netTotalMinor: 19900,
  vatTotalMinor: 1612,
  grossTotalMinor: 21512,
  paidTotalMinor: 0,
  outstandingMinor: 21512,
  recipient: {
    companyOrName: "FC Allschwil",
    street: "Hegenheimermattweg",
    houseNumber: "130",
    postalCode: "4123",
    city: "Allschwil",
    countryCode: "CH",
    invoiceEmail: "finanzen@fcallschwil.ch",
  },
  paymentInstruction: {
    reference: "21000000000313947643009000",
    amountMinor: 21512,
    currency: "CHF",
  },
  deliveryStatuses: ["NOT_SENT"],
  updatedAt: "2026-09-01T12:00:00.000Z",
};

function prismaMock() {
  return {
    invoice: {
      findFirst: vi.fn().mockResolvedValue({
        invoiceNumber: invoiceSnapshot.invoiceNumber,
        status: invoiceSnapshot.status,
        invoiceDate: new Date(`${invoiceSnapshot.invoiceDate}T12:00:00.000Z`),
        dueDate: new Date(`${invoiceSnapshot.dueDate}T12:00:00.000Z`),
        periodStart: new Date(`${invoiceSnapshot.periodStart}T12:00:00.000Z`),
        periodEnd: new Date(`${invoiceSnapshot.periodEnd}T12:00:00.000Z`),
        netTotalMinor: invoiceSnapshot.netTotalMinor,
        vatTotalMinor: invoiceSnapshot.vatTotalMinor,
        grossTotalMinor: invoiceSnapshot.grossTotalMinor,
        updatedAt: new Date(invoiceSnapshot.updatedAt),
        recipientSnapshot: invoiceSnapshot.recipient,
        paymentInstruction: invoiceSnapshot.paymentInstruction,
        deliveries: invoiceSnapshot.deliveryStatuses.map((status) => ({ status })),
        payments: [],
      }),
    },
    billingContract: {
      findUnique: vi.fn().mockResolvedValue({ id: "contract-id" }),
    },
    billingCustomer: {
      update: vi.fn(),
    },
  };
}

function billingProfile(
  overrides: Partial<BillingProfileRecord> & { id: string },
): BillingProfileRecord {
  return {
    billingCustomerId: "cust-fca",
    profileType: "BILLING",
    companyOrName: FCA_CANONICAL_RECIPIENT_SPEC.companyOrName,
    street: FCA_CANONICAL_RECIPIENT_SPEC.street,
    houseNumber: FCA_CANONICAL_RECIPIENT_SPEC.houseNumber,
    postalCode: FCA_CANONICAL_RECIPIENT_SPEC.postalCode,
    city: FCA_CANONICAL_RECIPIENT_SPEC.city,
    countryCode: FCA_CANONICAL_RECIPIENT_SPEC.countryCode,
    invoiceEmail: FCA_CANONICAL_RECIPIENT_SPEC.invoiceEmail,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("FCA canonical recipient profile selection", () => {
  it("matches canonical FC Allschwil billing profile fields", () => {
    const profile = billingProfile({ id: "p1" });
    expect(recipientProfileMatchesCanonical(profile)).toBe(true);
    expect(selectCanonicalRecipientProfile([profile])?.id).toBe("p1");
  });

  it("rejects non-matching profiles", () => {
    const profile = billingProfile({
      id: "p2",
      invoiceEmail: "other@example.invalid",
    });
    expect(selectCanonicalRecipientProfile([profile])).toBeNull();
  });
});

describe("billing attention — contract recipient profile", () => {
  it("does not warn when active contract has invoiceRecipientProfileId", () => {
    const queue = buildBillingAttentionQueue({
      referenceDate: new Date("2026-09-15T12:00:00.000Z"),
      customerKeyById: new Map([["c1", "fca-0001"]]),
      customerNameById: new Map([["c1", "FC Allschwil"]]),
      invoices: [],
      customers: [],
      contracts: [
        {
          key: "contract-fca",
          contractNumber: "FCA-2026-001",
          customerKey: "fca-0001",
          customerName: "FC Allschwil",
          status: "ACTIVE",
          invoiceRecipientProfileId: "profile-1",
        },
      ],
      reconciliationTransactions: [],
    });
    expect(
      queue.some(
        (q) =>
          q.kind === "CONTRACT_CONFIGURATION" &&
          q.reason === "Aktiver Vertrag ohne Rechnungsempfänger-Profil",
      ),
    ).toBe(false);
  });

  it("warns when active contract has no invoiceRecipientProfileId", () => {
    const queue = buildBillingAttentionQueue({
      referenceDate: new Date("2026-09-15T12:00:00.000Z"),
      customerKeyById: new Map([["c1", "fca-0001"]]),
      customerNameById: new Map([["c1", "FC Allschwil"]]),
      invoices: [],
      customers: [],
      contracts: [
        {
          key: "contract-fca",
          contractNumber: "FCA-2026-001",
          customerKey: "fca-0001",
          customerName: "FC Allschwil",
          status: "ACTIVE",
          invoiceRecipientProfileId: null,
        },
      ],
      reconciliationTransactions: [],
    });
    expect(
      queue.some(
        (q) =>
          q.kind === "CONTRACT_CONFIGURATION" &&
          q.reason === "Aktiver Vertrag ohne Rechnungsempfänger-Profil",
      ),
    ).toBe(true);
  });
});

describe("invoice integrity snapshot equality", () => {
  it("detects unchanged finalized invoice snapshots", () => {
    expect(invoiceIntegritySnapshotsEqual(invoiceSnapshot, { ...invoiceSnapshot })).toBe(
      true,
    );
  });
});

describe("applyFcaRecipientProfileLinkage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links contract without creating duplicate profile when canonical profile exists", async () => {
    const existing = billingProfile({ id: "profile-canonical" });
    const prisma = prismaMock();

    linkageMocks.updateBillingContract.mockResolvedValue({
      invoiceRecipientProfileId: existing.id,
    });
    linkageMocks.resolveInvoiceRecipientProfileForContract.mockResolvedValue(existing);

    const result = await applyFcaRecipientProfileLinkage(
      prisma as never,
      {
        customerKey: "fca-0001",
        customerId: "cust-fca",
        contractKey: "contract-fca",
        contractNumber: "FCA-2026-001",
        invoiceRecipientProfileIdBefore: null,
        profiles: [existing],
        canonicalProfileId: existing.id,
        invoiceIntegrity: invoiceSnapshot,
        defaultLanguage: "de-CH",
      },
      { actorUserId: "user-1" },
    );

    expect(linkageMocks.createBillingProfile).not.toHaveBeenCalled();
    expect(linkageMocks.updateBillingContract).toHaveBeenCalledWith({
      contractKey: "contract-fca",
      invoiceRecipientProfileId: existing.id,
      actorUserId: "user-1",
    });
    expect(result.profileReused).toBe(true);
    expect(result.contractLinked).toBe(true);
    expect(result.invoiceIntegrityUnchanged).toBe(true);
  });

  it("is idempotent when contract already linked to canonical profile", async () => {
    const existing = billingProfile({ id: "profile-canonical" });
    const prisma = prismaMock();

    linkageMocks.resolveInvoiceRecipientProfileForContract.mockResolvedValue(existing);

    const result = await applyFcaRecipientProfileLinkage(
      prisma as never,
      {
        customerKey: "fca-0001",
        customerId: "cust-fca",
        contractKey: "contract-fca",
        contractNumber: "FCA-2026-001",
        invoiceRecipientProfileIdBefore: existing.id,
        profiles: [existing],
        canonicalProfileId: existing.id,
        invoiceIntegrity: invoiceSnapshot,
        defaultLanguage: "de-CH",
      },
      { actorUserId: "user-1" },
    );

    expect(linkageMocks.createBillingProfile).not.toHaveBeenCalled();
    expect(linkageMocks.updateBillingContract).not.toHaveBeenCalled();
    expect(result.contractLinked).toBe(false);
    expect(result.profileReused).toBe(true);
  });
});
