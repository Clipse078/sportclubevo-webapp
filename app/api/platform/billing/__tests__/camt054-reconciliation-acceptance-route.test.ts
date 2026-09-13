import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  findLegalEntityByKey: vi.fn(),
  findConfirmedPaymentByBankTransactionId: vi.fn(),
  invoicePaymentInstructionFindFirst: vi.fn(),
  findBankReconciliationImportByContentHash: vi.fn(),
  createBankReconciliationImportWithTransactions: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/native-billing-repository", () => ({
  findLegalEntityByKey: mocks.findLegalEntityByKey,
}));

vi.mock("@/lib/billing/invoice-payments/invoice-payment-repository", () => ({
  findConfirmedPaymentByBankTransactionId: mocks.findConfirmedPaymentByBankTransactionId,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
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
    vi.stubEnv("STAGE_DB_URL", STAGE_URL);

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
    };

    expect(body.reconciliation.matchedCount).toBe(1);
    expect(body.reconciliation.entries[0]).toMatchObject({
      matchStatus: "MATCHED",
      matchMethod: "QRR_EXACT",
      invoiceNumber: "2026-000004",
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

  it("reproduces Preview failure mode when no payment instruction exists for the QRR", async () => {
    mocks.invoicePaymentInstructionFindFirst.mockResolvedValue(null);

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
        unmatchedCount: number;
        entries: Array<{
          matchStatus: string;
          matchMethod: string;
          message: string | null;
        }>;
      };
    };

    expect(body.reconciliation.matchedCount).toBe(0);
    expect(body.reconciliation.unmatchedCount).toBe(1);
    expect(body.reconciliation.entries[0]).toMatchObject({
      matchStatus: "UNMATCHED",
      matchMethod: "QRR_NOT_FOUND",
      message: "Keine Rechnung zur QRR-Referenz gefunden.",
    });
  });

  it("fails closed on Preview when DATABASE_URL is not aligned with STAGE_DB_URL", async () => {
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
    const body = (await res.json()) as { error: string; code: string };
    expect(body.error).toMatch(/STAGE-Datenbank/i);
    expect(body.code).toBe("PREVIEW_NOT_TARGETING_STAGE_DB");
    expect(mocks.findLegalEntityByKey).not.toHaveBeenCalled();
    expect(mocks.invoicePaymentInstructionFindFirst).not.toHaveBeenCalled();
  });

  it("fails closed before matching when Preview has no STAGE_DB_URL", async () => {
    vi.stubEnv("STAGE_DB_URL", "");

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
    });
    expect(mocks.findLegalEntityByKey).not.toHaveBeenCalled();
    expect(mocks.invoicePaymentInstructionFindFirst).not.toHaveBeenCalled();
  });
});
