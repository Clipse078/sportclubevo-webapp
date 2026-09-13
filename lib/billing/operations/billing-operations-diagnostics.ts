import { prisma } from "@/lib/db/prisma";
import { getStripeConfigStatus } from "@/lib/integrations/stripe/config";
import { resolveRuntimeIdentity } from "@/lib/server/runtime-identity";

const RECONCILIATION_MIGRATION =
  "20260913115000_sce_billing_reconciliation_operations";

export type OperationalState = "OPERATIONAL" | "NOT_OPERATIONAL";

export type BillingOperationsDiagnostics = {
  runtime: ReturnType<typeof resolveRuntimeIdentity>;
  migrationStatus: "CURRENT" | "MISSING" | "FAILED" | "UNKNOWN";
  billingEncryptionKeyConfigured: boolean;
  legalEntity: {
    key: string;
    displayName: string;
    bankAccountConfigured: boolean;
    qrIbanConfigured: boolean;
    referenceType: string | null;
  } | null;
  providers: {
    swissQr: OperationalState;
    camt054: OperationalState;
    stripe: "CONNECTED" | "NOT_CONNECTED";
  };
  readiness: {
    result: "READY" | "BLOCKED";
    missing: string[];
  };
};

async function getMigrationStatus(): Promise<
  BillingOperationsDiagnostics["migrationStatus"]
> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>
    >`
      SELECT "migration_name", "finished_at", "rolled_back_at"
      FROM "_prisma_migrations"
      WHERE "migration_name" = ${RECONCILIATION_MIGRATION}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return "MISSING";
    if (!row.finished_at && !row.rolled_back_at) return "FAILED";
    return row.finished_at ? "CURRENT" : "MISSING";
  } catch {
    return "UNKNOWN";
  }
}

export async function getBillingOperationsDiagnostics(
  env: NodeJS.ProcessEnv = process.env,
): Promise<BillingOperationsDiagnostics> {
  const runtime = resolveRuntimeIdentity(env);
  const [migrationStatus, legalEntity] = await Promise.all([
    getMigrationStatus(),
    prisma.legalEntity.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: {
        key: true,
        displayName: true,
        bankAccounts: {
          where: {
            OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }],
          },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          take: 1,
          select: {
            ibanEncrypted: true,
            qrIbanEncrypted: true,
            referenceStrategy: true,
          },
        },
      },
    }),
  ]);

  const account = legalEntity?.bankAccounts[0] ?? null;
  const bankAccountConfigured = Boolean(account?.ibanEncrypted);
  const qrIbanConfigured = Boolean(account?.qrIbanEncrypted);
  const referenceType = account?.referenceStrategy ?? null;
  const swissQrOperational =
    bankAccountConfigured && qrIbanConfigured && referenceType === "QRR";
  const identityOperational =
    runtime.dataEnvironment !== "UNKNOWN" &&
    runtime.databaseFingerprintMatchesConfiguredTarget;
  const encryptionConfigured = Boolean(
    env.SCE_BILLING_ENCRYPTION_KEY?.trim(),
  );
  const stripeConnected = getStripeConfigStatus(env).allValid;

  const missing: string[] = [];
  if (migrationStatus !== "CURRENT") {
    missing.push(`billing migration: ${migrationStatus.toLowerCase()}`);
  }
  if (!legalEntity) missing.push("active legal entity");
  if (!bankAccountConfigured) missing.push("active billing bank account");
  if (!qrIbanConfigured) missing.push("QR-IBAN");
  if (referenceType !== "QRR") missing.push("QRR reference strategy");
  if (!encryptionConfigured) missing.push("billing encryption key");
  if (runtime.dataEnvironment === "UNKNOWN") {
    missing.push("SCE_DATA_ENVIRONMENT");
  }
  if (!runtime.databaseFingerprintMatchesConfiguredTarget) {
    missing.push("effective database fingerprint attestation");
  }

  return {
    runtime: { ...runtime, legalEntityKey: legalEntity?.key ?? null },
    migrationStatus,
    billingEncryptionKeyConfigured: encryptionConfigured,
    legalEntity: legalEntity
      ? {
          key: legalEntity.key,
          displayName: legalEntity.displayName,
          bankAccountConfigured,
          qrIbanConfigured,
          referenceType,
        }
      : null,
    providers: {
      swissQr: swissQrOperational ? "OPERATIONAL" : "NOT_OPERATIONAL",
      camt054:
        swissQrOperational &&
        identityOperational &&
        migrationStatus === "CURRENT"
          ? "OPERATIONAL"
          : "NOT_OPERATIONAL",
      stripe: stripeConnected ? "CONNECTED" : "NOT_CONNECTED",
    },
    readiness: {
      result: missing.length === 0 ? "READY" : "BLOCKED",
      missing,
    },
  };
}
