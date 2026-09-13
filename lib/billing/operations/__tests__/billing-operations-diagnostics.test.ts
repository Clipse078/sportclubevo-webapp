import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  findFirst: vi.fn(),
  stripeStatus: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    legalEntity: { findFirst: mocks.findFirst },
  },
}));
vi.mock("@/lib/integrations/stripe/config", () => ({
  getStripeConfigStatus: mocks.stripeStatus,
}));

const { getBillingOperationsDiagnostics } = await import(
  "../billing-operations-diagnostics"
);
const { getDatabaseFingerprintFromEffectivePrismaSource } = await import(
  "@/lib/server/runtime-identity"
);

describe("billing operations diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryRaw.mockResolvedValue([
      {
        migration_name: "20260913115000_sce_billing_reconciliation_operations",
        finished_at: new Date(),
        rolled_back_at: null,
      },
    ]);
    mocks.findFirst.mockResolvedValue({
      key: "sportclubevo-by-tulip-digital",
      displayName: "SportClubEvo",
      bankAccounts: [
        {
          ibanEncrypted: "encrypted-secret",
          qrIbanEncrypted: "encrypted-secret",
          referenceStrategy: "QRR",
        },
      ],
    });
    mocks.stripeStatus.mockReturnValue({ allValid: true });
  });

  it("reports operational state without leaking secret values or DB URLs", async () => {
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "preview",
      APP_ENV: "preview",
      SCE_DATA_ENVIRONMENT: "STAGE",
      DATABASE_URL: "postgresql://billing:top-secret@stage.test/sce_stage",
      SCE_BILLING_ENCRYPTION_KEY: "never-expose-this",
      STRIPE_SECRET_KEY: "sk_test_never-expose",
    };
    env.SCE_DATA_DATABASE_FINGERPRINT =
      getDatabaseFingerprintFromEffectivePrismaSource(env)!;

    const result = await getBillingOperationsDiagnostics(env);
    expect(result.readiness).toEqual({ result: "READY", missing: [] });
    expect(result.providers).toEqual({
      swissQr: "OPERATIONAL",
      camt054: "OPERATIONAL",
      stripe: "CONNECTED",
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("top-secret");
    expect(serialized).not.toContain("never-expose");
    expect(serialized).not.toContain("encrypted-secret");
    expect(serialized).not.toContain("postgresql://");
  });
});
