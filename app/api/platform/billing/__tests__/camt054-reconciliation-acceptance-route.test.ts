import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  findLegalEntityByKey: vi.fn(),
  findConfirmedPaymentByBankTransactionId: vi.fn(),
  legalEntityFindUnique: vi.fn(),
  invoiceFindUnique: vi.fn(),
  invoicePaymentInstructionFindFirst: vi.fn(),
  findBankReconciliationImportByContentHash: vi.fn(),
  createBankReconciliationImportWithTransactions: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));
vi.mock("@/lib/security/platform-superadmin", () => ({
  isPlatformSuperAdmin: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/billing/native-billing-repository", () => ({
  findLegalEntityByKey: mocks.findLegalEntityByKey,
}));

vi.mock("@/lib/billing/invoice-payments/invoice-payment-repository", () => ({
  findConfirmedPaymentByBankTransactionId: mocks.findConfirmedPaymentByBankTransactionId,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    legalEntity: {
      findUnique: mocks.legalEntityFindUnique,
    },
    invoice: {
      findUnique: mocks.invoiceFindUnique,
    },
    invoicePaymentInstruction: {
      findFirst: mocks.invoicePaymentInstructionFindFirst,
    },
  },
}));

vi.mock("@/lib/billing/camt054-reconciliation/camt054-reconciliation-repository", () => ({
  findBankReconciliationImportByContentHash: mocks.findBankReconciliationImportByContentHash,
  createBankReconciliationImportWithTransactions:
    mocks.createBankReconciliationImportWithTransactions,
  deriveImportStatus: () => "COMPLETED",
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

const { POST } = await import("../legal-entities/[key]/camt054-reconciliation/route");

const fixtureA = readFileSync(
  path.join(
    import.meta.dirname,
    "../../../../../lib/billing/camt054/__tests__/fixtures/acceptance/a-exact-qrr-full.camt054.xml",
  ),
  "utf8",
);

const LEGAL_ENTITY_ID = "le-sce-billing-test";
const LEGAL_ENTITY_KEY = "sportclubevo-by-tulip-digital";
const FIXTURE_QRR = "273282026000004030551312759";
const STAGE_URL =
  "postgresql://u:p@ep-wispy-hall-aso93dy6-pooler.c-4.eu-central-1.aws.neon.tech/neondb";

describe("camt054 reconciliation route acceptance fixture A (SWISS-01H3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("APP_ENV", "preview");
    vi.stubEnv("DATABASE_URL", STAGE_URL);
    vi.stubEnv("SCE_DATA_ENVIRONMENT", "STAGE");
    vi.stubEnv("SCE_DATA_DATABASE_FINGERPRINT", "acd3b37682911890");

    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: true,
      actorUserId: "user-1",
    });
    mocks.findLegalEntityByKey.mockResolvedValue({
      id: LEGAL_ENTITY_ID,
      key: LEGAL_ENTITY_KEY,
    });
    mocks.findConfirmedPaymentByBankTransactionId.mockResolvedValue(null);
    mocks.findBankReconciliationImportByContentHash.mockResolvedValue(null);
    mocks.legalEntityFindUnique.mockResolvedValue({ id: LEGAL_ENTITY_ID });
    mocks.invoiceFindUnique.mockResolvedValue({
      id: "inv-id-2026-000004",
      paymentInstruction: {
        paymentMethod: "BANK_TRANSFER_SWISS_QR",
        referenceType: "QRR",
      },
    });
  });

  it("returns QRR_EXACT / MATCHED for fixture A through the HTTP route path", async () => {
    mocks.invoicePaymentInstructionFindFirst.mockResolvedValue({
      id: "pi-2026-000004",
      invoiceId: "inv-id-2026-000004",
      currency: "CHF",
      invoice: {
        id: "inv-id-2026-000004",
        key: "inv-sce-test-01g-2",
        invoiceNumber: "2026-000004",
        legalEntityId: LEGAL_ENTITY_ID,
        currency: "CHF",
        grossTotalMinor: 21512,
        status: "FINALIZED",
      },
    });

    const res = await POST(
      new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ xml: fixtureA, dryRun: true }),
      }),
      { params: Promise.resolve({ key: LEGAL_ENTITY_KEY }) },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      reconciliation: {
        matchedCount: number;
        entries: Array<{
          matchStatus: string;
          matchMethod: string;
          invoiceNumber: string | null;
        }>;
      };
      diagnostics: {
        databaseFingerprint: string;
        dataEnvironment: string;
        databaseAligned: boolean;
        legalEntityKey: string;
      };
    };

    expect(body.reconciliation.matchedCount).toBe(1);
    expect(body.reconciliation.entries[0]).toMatchObject({
      matchStatus: "MATCHED",
      matchMethod: "QRR_EXACT",
      invoiceNumber: "2026-000004",
    });
    expect(body.diagnostics).toMatchObject({
      databaseFingerprint: "acd3b37682911890",
      dataEnvironment: "STAGE",
      databaseAligned: true,
      legalEntityKey: LEGAL_ENTITY_KEY,
    });

    expect(mocks.invoicePaymentInstructionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          referenceType: "QRR",
          reference: FIXTURE_QRR,
          invoice: { legalEntityId: LEGAL_ENTITY_ID },
        }),
      }),
    );
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(
      PERMISSIONS.BILLING_MANAGE,
    );
  });

  it("does not hard-code synthetic acceptance invoice probes in domain code", async () => {
    mocks.invoicePaymentInstructionFindFirst.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ xml: fixtureA, dryRun: true }),
      }),
      { params: Promise.resolve({ key: LEGAL_ENTITY_KEY }) },
    );

    expect(res.status).toBe(200);
    expect(mocks.findLegalEntityByKey).toHaveBeenCalledWith(LEGAL_ENTITY_KEY);
    expect(mocks.legalEntityFindUnique).not.toHaveBeenCalled();
    expect(mocks.invoiceFindUnique).not.toHaveBeenCalled();
  });

  it("fails closed on Preview when the effective DB identity is not attested", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://u:p@ep-other-branch-aso93dy6-pooler.c-4.eu-central-1.aws.neon.tech/neondb",
    );

    const res = await POST(
      new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ xml: fixtureA, dryRun: true }),
      }),
      { params: Promise.resolve({ key: LEGAL_ENTITY_KEY }) },
    );

    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: string;
      code: string;
      diagnostics: { databaseAligned: boolean };
    };
    expect(body.error).toMatch(/STAGE-Datenumgebung/i);
    expect(body.code).toBe("PREVIEW_NOT_TARGETING_STAGE_DB");
    expect(body.diagnostics.databaseAligned).toBe(false);
    expect(mocks.findLegalEntityByKey).not.toHaveBeenCalled();
    expect(mocks.legalEntityFindUnique).not.toHaveBeenCalled();
    expect(mocks.invoicePaymentInstructionFindFirst).not.toHaveBeenCalled();
  });

  it("fails closed before matching when Preview has no data environment", async () => {
    vi.stubEnv("SCE_DATA_ENVIRONMENT", "");

    const res = await POST(
      new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ xml: fixtureA, dryRun: true }),
      }),
      { params: Promise.resolve({ key: LEGAL_ENTITY_KEY }) },
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      code: "PREVIEW_NOT_TARGETING_STAGE_DB",
      diagnostics: {
        dataEnvironment: "UNKNOWN",
        databaseAligned: false,
      },
    });
    expect(mocks.findLegalEntityByKey).not.toHaveBeenCalled();
    expect(mocks.invoicePaymentInstructionFindFirst).not.toHaveBeenCalled();
  });

  it("fails closed when Preview points to an unattested database", async () => {
    const wrongUrl =
      "postgresql://u:p@ep-other-branch-aso93dy6-pooler.c-4.eu-central-1.aws.neon.tech/neondb";
    vi.stubEnv("DATABASE_URL", wrongUrl);

    const res = await POST(
      new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ xml: fixtureA, dryRun: true }),
      }),
      { params: Promise.resolve({ key: LEGAL_ENTITY_KEY }) },
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      code: "PREVIEW_NOT_TARGETING_STAGE_DB",
      diagnostics: { databaseAligned: false },
    });
    expect(mocks.legalEntityFindUnique).not.toHaveBeenCalled();
    expect(mocks.findLegalEntityByKey).not.toHaveBeenCalled();
    expect(mocks.invoicePaymentInstructionFindFirst).not.toHaveBeenCalled();
  });

  it("does not expose Preview diagnostics in Production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");
    mocks.invoicePaymentInstructionFindFirst.mockResolvedValue({
      id: "pi-2026-000004",
      invoiceId: "inv-id-2026-000004",
      currency: "CHF",
      invoice: {
        id: "inv-id-2026-000004",
        key: "inv-sce-test-01g-2",
        invoiceNumber: "2026-000004",
        legalEntityId: LEGAL_ENTITY_ID,
        currency: "CHF",
        grossTotalMinor: 21512,
        status: "FINALIZED",
      },
    });

    const res = await POST(
      new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ xml: fixtureA, dryRun: true }),
      }),
      { params: Promise.resolve({ key: LEGAL_ENTITY_KEY }) },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("diagnostics");
    expect(mocks.legalEntityFindUnique).not.toHaveBeenCalled();
    expect(mocks.invoiceFindUnique).not.toHaveBeenCalled();
  });
});
