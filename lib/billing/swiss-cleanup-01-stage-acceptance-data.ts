/**
 * SWISS-CLEANUP-01 — STAGE billing acceptance synthetic data cleanup (selection + guards).
 *
 * Data hygiene only: removes explicitly allowlisted SCE Billing Test Club fixtures.
 * Does not touch invoice sequence state, FCA records, legal entity, or bank accounts.
 */

import type { PrismaClient } from "@prisma/client";
import { evaluateOperationalMutationGuard } from "@/lib/server/operational-database-guard";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
  requireBillingDataEnvironment,
  resolveRuntimeIdentity,
} from "@/lib/server/runtime-identity";
import { getRuntimeEnvironment } from "@/lib/env";
import { NATIVE_BILLING_AUDIT_MODULE } from "@/lib/billing/native-billing-audit";

// ---------------------------------------------------------------------------
// Canonical identifiers (exact allowlist — no broad predicates)
// ---------------------------------------------------------------------------

export const OPERATION_ID = "swiss-cleanup-01-stage";
export const EXECUTE_CONFIRMATION = "SCE-SWISS-CLEANUP-01-STAGE";
export const STAGE_CANONICAL_DATABASE_FINGERPRINT = "acd3b37682911890";

export const PROTECTED_LEGAL_ENTITY_KEY = "sportclubevo-by-tulip-digital";
export const PROTECTED_FCA_CUSTOMER_KEY = "fca-0001";
export const PROTECTED_FCA_CONTRACT_NUMBER = "FCA-2026-001";
export const PROTECTED_FCA_INVOICE_VOID_NUMBER = "2026-000001";
export const PROTECTED_FCA_INVOICE_ACTIVE_NUMBER = "2026-000002";

export const SYNTHETIC_CUSTOMER_KEY = "sce-billing-test-01g";
export const SYNTHETIC_CUSTOMER_DISPLAY_NAME = "SCE Billing Test Club";
export const SYNTHETIC_CONTRACT_KEY = "sce-test-01g";
export const SYNTHETIC_CONTRACT_NUMBER = "SCE-TEST-01G";
export const SYNTHETIC_INVOICE_KEYS = [
  "inv-sce-test-01g",
  "inv-sce-test-01g-2",
] as const;
export const SYNTHETIC_INVOICE_NUMBERS = [
  "2026-000003",
  "2026-000004",
] as const;
export const SYNTHETIC_CAMT_IMPORT_FILENAME = "a-exact-qrr-full.camt054.xml";

export const SYNTHETIC_INVOICE_KEY_SET = new Set<string>(SYNTHETIC_INVOICE_KEYS);
export const SYNTHETIC_INVOICE_NUMBER_SET = new Set<string>(
  SYNTHETIC_INVOICE_NUMBERS,
);

export type CleanupExecuteGuardName =
  | "APP_ENV_STAGE"
  | "DATA_ENVIRONMENT_STAGE"
  | "DATABASE_FINGERPRINT_STAGE"
  | "EXECUTE_FLAG_SET"
  | "EXACT_CONFIRMATION"
  | "OPERATION_AUTHORIZATION"
  | "NOT_PRODUCTION";

export type GuardStatus = "PASS" | "FAIL" | "NOT_EVALUATED";

export type CleanupExecuteGuardResult = {
  gate: CleanupExecuteGuardName;
  status: GuardStatus;
  detail: string;
};

export type CleanupExecuteInput = {
  execute: boolean;
  confirm: string | null | undefined;
  env: NodeJS.ProcessEnv;
  databaseUrl: string | undefined;
};

export function expectedOperationAuthorization(env: NodeJS.ProcessEnv): string {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  return `${OPERATION_ID}:${runtime.appEnv}`;
}

export function evaluateCleanupExecuteGuards(
  input: CleanupExecuteInput,
): CleanupExecuteGuardResult[] {
  const env = input.env;
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  const identity = resolveRuntimeIdentity(env);
  const effectiveFingerprint =
    getDatabaseFingerprintFromEffectivePrismaSource(env)?.toLowerCase() ?? null;
  const configuredFingerprint =
    env.SCE_DATA_DATABASE_FINGERPRINT?.trim().toLowerCase() || null;
  const dataEnv = getRuntimeDataEnvironment(env);

  const results: CleanupExecuteGuardResult[] = [];

  const notEvaluated = (
    gate: CleanupExecuteGuardName,
    detail: string,
  ): CleanupExecuteGuardResult => ({
    gate,
    status: "NOT_EVALUATED",
    detail,
  });

  if (!input.execute) {
    return [
      notEvaluated("EXECUTE_FLAG_SET", "dry-run mode"),
      notEvaluated("EXACT_CONFIRMATION", "dry-run mode"),
      notEvaluated("OPERATION_AUTHORIZATION", "dry-run mode"),
    ];
  }

  results.push({
    gate: "EXECUTE_FLAG_SET",
    status: "PASS",
    detail: "--execute present",
  });

  results.push({
    gate: "EXACT_CONFIRMATION",
    status:
      input.confirm?.trim() === EXECUTE_CONFIRMATION ? "PASS" : "FAIL",
    detail:
      input.confirm?.trim() === EXECUTE_CONFIRMATION
        ? "confirmation token matches"
        : `expected --confirm ${EXECUTE_CONFIRMATION}`,
  });

  results.push({
    gate: "APP_ENV_STAGE",
    status: runtime.isStage ? "PASS" : "FAIL",
    detail: `APP_ENV=${runtime.appEnv}`,
  });

  results.push({
    gate: "NOT_PRODUCTION",
    status: runtime.isProd ? "FAIL" : "PASS",
    detail: runtime.isProd ? "production deployment blocked" : "not production",
  });

  results.push({
    gate: "DATA_ENVIRONMENT_STAGE",
    status: dataEnv === "STAGE" ? "PASS" : "FAIL",
    detail: `SCE_DATA_ENVIRONMENT=${dataEnv}`,
  });

  const fingerprintOk =
    effectiveFingerprint === STAGE_CANONICAL_DATABASE_FINGERPRINT &&
    configuredFingerprint === STAGE_CANONICAL_DATABASE_FINGERPRINT &&
    identity.databaseFingerprintMatchesConfiguredTarget;
  results.push({
    gate: "DATABASE_FINGERPRINT_STAGE",
    status: fingerprintOk ? "PASS" : "FAIL",
    detail: `effective=${effectiveFingerprint ?? "null"} expected=${STAGE_CANONICAL_DATABASE_FINGERPRINT}`,
  });

  const mutationGuard = evaluateOperationalMutationGuard(
    {
      operationId: OPERATION_ID,
      databaseUrl: input.databaseUrl,
      explicitIntent: true,
      allowedRemoteEnvironments: ["stage"],
    },
    env,
  );
  results.push({
    gate: "OPERATION_AUTHORIZATION",
    status: mutationGuard.allowed ? "PASS" : "FAIL",
    detail: mutationGuard.allowed
      ? expectedOperationAuthorization(env)
      : mutationGuard.reason,
  });

  return results;
}

export function assertCleanupExecuteGuards(input: CleanupExecuteInput): void {
  const results = evaluateCleanupExecuteGuards(input);
  const failures = results.filter((r) => r.status === "FAIL");
  if (failures.length > 0) {
    throw new Error(
      `Execute guards failed: ${failures.map((f) => `${f.gate}: ${f.detail}`).join("; ")}`,
    );
  }
}

export function assertCleanupStageIdentityReadOnly(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  if (!runtime.isStage) {
    throw new Error(
      `STAGE identity required: APP_ENV must be "stage" (got ${runtime.appEnv}).`,
    );
  }
  requireBillingDataEnvironment("STAGE", env);
  const fp = getDatabaseFingerprintFromEffectivePrismaSource(env);
  if (fp?.toLowerCase() !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      `STAGE database fingerprint mismatch: got ${fp ?? "null"}, expected ${STAGE_CANONICAL_DATABASE_FINGERPRINT}.`,
    );
  }
}

export type InvoiceSnapshot = {
  id: string;
  key: string;
  invoiceNumber: string | null;
  status: string;
  billingCustomerId: string;
  billingContractId: string | null;
  updatedAt: Date;
  paymentCount: number;
  deliveryStatuses: string[];
};

export type FcaProtectionSnapshot = {
  customerFound: boolean;
  customerKey: string | null;
  contractFound: boolean;
  contractNumber: string | null;
  invoiceVoid: InvoiceSnapshot | null;
  invoiceActive: InvoiceSnapshot | null;
};

export type SyntheticTargetSnapshot = {
  customer: { id: string; key: string; displayName: string } | null;
  contract: {
    id: string;
    key: string;
    contractNumber: string;
    billingCustomerId: string;
  } | null;
  invoices: InvoiceSnapshot[];
  paymentIds: string[];
  paymentInstructionIds: string[];
  deliveryIds: string[];
  reconciliationImports: Array<{
    id: string;
    key: string;
    filename: string;
    transactionIds: string[];
    mixedImportBlocked: boolean;
    mixedImportReason: string | null;
  }>;
  reconciliationTransactionIds: string[];
  auditLogIds: string[];
  billingProfileIds: string[];
  tenantLinkIds: string[];
};

export type InvoiceSequenceSnapshot = {
  legalEntityId: string;
  sequenceYear: number;
  lastNumber: number;
};

export type CleanupInventory = {
  legalEntityKey: string | null;
  databaseFingerprint: string | null;
  fca: FcaProtectionSnapshot;
  synthetic: SyntheticTargetSnapshot;
  invoiceSequences: InvoiceSequenceSnapshot[];
  blockingErrors: string[];
  auditCleanupDecision: string;
};

async function loadInvoiceSnapshot(
  prisma: PrismaClient,
  where: { key?: string; invoiceNumber?: string },
): Promise<InvoiceSnapshot | null> {
  const invoice = await prisma.invoice.findFirst({
    where,
    select: {
      id: true,
      key: true,
      invoiceNumber: true,
      status: true,
      billingCustomerId: true,
      billingContractId: true,
      updatedAt: true,
      _count: { select: { payments: true } },
      deliveries: { select: { status: true } },
    },
  });
  if (!invoice) return null;
  return {
    id: invoice.id,
    key: invoice.key,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    billingCustomerId: invoice.billingCustomerId,
    billingContractId: invoice.billingContractId,
    updatedAt: invoice.updatedAt,
    paymentCount: invoice._count.payments,
    deliveryStatuses: invoice.deliveries.map((d) => d.status),
  };
}

export function isSyntheticInvoiceRecord(invoice: {
  key: string;
  invoiceNumber: string | null;
  billingCustomerId: string;
  syntheticCustomerId: string | null;
}): boolean {
  if (invoice.billingCustomerId !== invoice.syntheticCustomerId) {
    return false;
  }
  return (
    SYNTHETIC_INVOICE_KEY_SET.has(invoice.key) ||
    (invoice.invoiceNumber !== null &&
      SYNTHETIC_INVOICE_NUMBER_SET.has(invoice.invoiceNumber))
  );
}

export function evaluateCamtImportDeletable(input: {
  filename: string;
  transactions: Array<{
    id: string;
    invoiceId: string | null;
    invoiceKey: string | null;
    invoiceNumber: string | null;
    invoiceCustomerKey: string | null;
  }>;
  syntheticCustomerKey: string;
  protectedInvoiceIds: Set<string>;
}): { deletable: boolean; reason: string | null; transactionIds: string[] } {
  if (input.filename !== SYNTHETIC_CAMT_IMPORT_FILENAME) {
    return { deletable: false, reason: null, transactionIds: [] };
  }
  const transactionIds: string[] = [];
  for (const tx of input.transactions) {
    transactionIds.push(tx.id);
    if (!tx.invoiceId) {
      continue;
    }
    if (input.protectedInvoiceIds.has(tx.invoiceId)) {
      return {
        deletable: false,
        reason: `Import ${input.filename} references protected invoice id ${tx.invoiceId}`,
        transactionIds: [],
      };
    }
    const syntheticOwned =
      tx.invoiceCustomerKey === input.syntheticCustomerKey &&
      ((tx.invoiceKey && SYNTHETIC_INVOICE_KEY_SET.has(tx.invoiceKey)) ||
        (tx.invoiceNumber &&
          SYNTHETIC_INVOICE_NUMBER_SET.has(tx.invoiceNumber)));
    if (!syntheticOwned) {
      return {
        deletable: false,
        reason: `Import ${input.filename} contains non-synthetic transaction ${tx.id}`,
        transactionIds: [],
      };
    }
  }
  return { deletable: true, reason: null, transactionIds };
}

export async function collectCleanupInventory(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CleanupInventory> {
  const identity = resolveRuntimeIdentity(env);
  const blockingErrors: string[] = [];

  const legalEntity = await prisma.legalEntity.findUnique({
    where: { key: PROTECTED_LEGAL_ENTITY_KEY },
    select: { id: true, key: true },
  });

  const fcaCustomer = await prisma.billingCustomer.findUnique({
    where: { key: PROTECTED_FCA_CUSTOMER_KEY },
    select: { id: true, key: true },
  });

  const fcaContract = fcaCustomer
    ? await prisma.billingContract.findFirst({
        where: {
          billingCustomerId: fcaCustomer.id,
          contractNumber: PROTECTED_FCA_CONTRACT_NUMBER,
        },
        select: { id: true, contractNumber: true },
      })
    : null;

  const invoiceVoid = await loadInvoiceSnapshot(prisma, {
    invoiceNumber: PROTECTED_FCA_INVOICE_VOID_NUMBER,
  });
  const invoiceActive = await loadInvoiceSnapshot(prisma, {
    invoiceNumber: PROTECTED_FCA_INVOICE_ACTIVE_NUMBER,
  });

  const syntheticCustomer = await prisma.billingCustomer.findUnique({
    where: { key: SYNTHETIC_CUSTOMER_KEY },
    select: { id: true, key: true, displayName: true },
  });

  if (
    syntheticCustomer &&
    syntheticCustomer.displayName !== SYNTHETIC_CUSTOMER_DISPLAY_NAME
  ) {
    blockingErrors.push(
      `Synthetic customer key ${SYNTHETIC_CUSTOMER_KEY} display name mismatch (got "${syntheticCustomer.displayName}").`,
    );
  }

  const syntheticContract = syntheticCustomer
    ? await prisma.billingContract.findFirst({
        where: {
          OR: [
            { key: SYNTHETIC_CONTRACT_KEY },
            { contractNumber: SYNTHETIC_CONTRACT_NUMBER },
          ],
        },
        select: {
          id: true,
          key: true,
          contractNumber: true,
          billingCustomerId: true,
        },
      })
    : null;

  if (
    syntheticContract &&
    syntheticContract.billingCustomerId !== syntheticCustomer?.id
  ) {
    blockingErrors.push(
      "Synthetic contract is not owned by the synthetic customer — STOP.",
    );
  }

  const syntheticInvoicesRaw = await prisma.invoice.findMany({
    where: {
      OR: [
        { key: { in: [...SYNTHETIC_INVOICE_KEYS] } },
        { invoiceNumber: { in: [...SYNTHETIC_INVOICE_NUMBERS] } },
      ],
    },
    select: {
      id: true,
      key: true,
      invoiceNumber: true,
      status: true,
      billingCustomerId: true,
      billingContractId: true,
      updatedAt: true,
      billingCustomer: { select: { key: true } },
      _count: { select: { payments: true } },
      deliveries: { select: { status: true } },
    },
  });

  const protectedInvoiceIds = new Set(
    [invoiceVoid?.id, invoiceActive?.id].filter(Boolean) as string[],
  );

  for (const inv of syntheticInvoicesRaw) {
    if (inv.billingCustomer.key !== SYNTHETIC_CUSTOMER_KEY) {
      blockingErrors.push(
        `Synthetic invoice ${inv.key} belongs to customer ${inv.billingCustomer.key}, not ${SYNTHETIC_CUSTOMER_KEY}.`,
      );
    }
    if (fcaCustomer && inv.billingCustomerId === fcaCustomer.id) {
      blockingErrors.push(
        `Synthetic invoice ${inv.key} is linked to protected FCA customer.`,
      );
    }
    if (
      inv.invoiceNumber &&
      (inv.invoiceNumber === PROTECTED_FCA_INVOICE_VOID_NUMBER ||
        inv.invoiceNumber === PROTECTED_FCA_INVOICE_ACTIVE_NUMBER)
    ) {
      blockingErrors.push(
        `Invoice number ${inv.invoiceNumber} is protected FCA numbering.`,
      );
    }
  }

  const syntheticInvoiceIds = syntheticInvoicesRaw.map((i) => i.id);
  const syntheticInvoices: InvoiceSnapshot[] = syntheticInvoicesRaw.map(
    (invoice) => ({
      id: invoice.id,
      key: invoice.key,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      billingCustomerId: invoice.billingCustomerId,
      billingContractId: invoice.billingContractId,
      updatedAt: invoice.updatedAt,
      paymentCount: invoice._count.payments,
      deliveryStatuses: invoice.deliveries.map((d) => d.status),
    }),
  );

  const payments = syntheticInvoiceIds.length
    ? await prisma.invoicePayment.findMany({
        where: { invoiceId: { in: syntheticInvoiceIds } },
        select: { id: true, invoiceId: true },
      })
    : [];

  for (const payment of payments) {
    if (protectedInvoiceIds.has(payment.invoiceId)) {
      blockingErrors.push(
        `Synthetic payment ${payment.id} points to protected FCA invoice.`,
      );
    }
  }

  const paymentInstructions = syntheticInvoiceIds.length
    ? await prisma.invoicePaymentInstruction.findMany({
        where: { invoiceId: { in: syntheticInvoiceIds } },
        select: { id: true, invoiceId: true },
      })
    : [];

  const deliveries = syntheticInvoiceIds.length
    ? await prisma.invoiceDelivery.findMany({
        where: { invoiceId: { in: syntheticInvoiceIds } },
        select: { id: true },
      })
    : [];

  const camtImports = await prisma.bankReconciliationImport.findMany({
    where: { filename: SYNTHETIC_CAMT_IMPORT_FILENAME },
    select: {
      id: true,
      key: true,
      filename: true,
      transactions: {
        select: {
          id: true,
          invoiceId: true,
          invoice: {
            select: {
              key: true,
              invoiceNumber: true,
              billingCustomer: { select: { key: true } },
            },
          },
        },
      },
    },
  });

  const reconciliationImports: SyntheticTargetSnapshot["reconciliationImports"] =
    [];
  const reconciliationTransactionIds: string[] = [];

  for (const imp of camtImports) {
    const evaluation = evaluateCamtImportDeletable({
      filename: imp.filename,
      transactions: imp.transactions.map((tx) => ({
        id: tx.id,
        invoiceId: tx.invoiceId,
        invoiceKey: tx.invoice?.key ?? null,
        invoiceNumber: tx.invoice?.invoiceNumber ?? null,
        invoiceCustomerKey: tx.invoice?.billingCustomer.key ?? null,
      })),
      syntheticCustomerKey: SYNTHETIC_CUSTOMER_KEY,
      protectedInvoiceIds,
    });
    if (!evaluation.deletable && imp.transactions.length > 0) {
      blockingErrors.push(
        evaluation.reason ??
          `Mixed reconciliation import ${imp.filename} — manual review required.`,
      );
    }
    reconciliationImports.push({
      id: imp.id,
      key: imp.key,
      filename: imp.filename,
      transactionIds: evaluation.deletable ? evaluation.transactionIds : [],
      mixedImportBlocked: !evaluation.deletable && imp.transactions.length > 0,
      mixedImportReason: evaluation.reason,
    });
    if (evaluation.deletable) {
      reconciliationTransactionIds.push(...evaluation.transactionIds);
    }
  }

  const entityIdsForAudit = [
    syntheticCustomer?.id,
    syntheticContract?.id,
    ...syntheticInvoiceIds,
    ...payments.map((p) => p.id),
    ...paymentInstructions.map((p) => p.id),
    ...deliveries.map((d) => d.id),
    ...reconciliationImports
      .filter((i) => !i.mixedImportBlocked)
      .map((i) => i.id),
  ].filter(Boolean) as string[];

  const auditLogs = entityIdsForAudit.length
    ? await prisma.auditLog.findMany({
        where: {
          moduleKey: NATIVE_BILLING_AUDIT_MODULE,
          entityId: { in: entityIdsForAudit },
        },
        select: { id: true },
      })
    : [];

  const billingProfiles = syntheticCustomer
    ? await prisma.billingProfile.findMany({
        where: { billingCustomerId: syntheticCustomer.id },
        select: { id: true },
      })
    : [];

  const tenantLinks = syntheticCustomer
    ? await prisma.billingCustomerTenant.findMany({
        where: { billingCustomerId: syntheticCustomer.id },
        select: { id: true },
      })
    : [];

  const invoiceSequences = legalEntity
    ? await prisma.invoiceSequence.findMany({
        where: { legalEntityId: legalEntity.id },
        select: {
          legalEntityId: true,
          sequenceYear: true,
          lastNumber: true,
        },
      })
    : [];

  const auditCleanupDecision =
    "Delete billing-module AuditLog rows whose entityId references synthetic acceptance objects being removed; retain all other audit history (immutable platform audit policy).";

  return {
    legalEntityKey: legalEntity?.key ?? null,
    databaseFingerprint: identity.databaseFingerprint,
    fca: {
      customerFound: Boolean(fcaCustomer),
      customerKey: fcaCustomer?.key ?? null,
      contractFound: Boolean(fcaContract),
      contractNumber: fcaContract?.contractNumber ?? null,
      invoiceVoid,
      invoiceActive,
    },
    synthetic: {
      customer: syntheticCustomer,
      contract: syntheticContract,
      invoices: syntheticInvoices,
      paymentIds: payments.map((p) => p.id),
      paymentInstructionIds: paymentInstructions.map((p) => p.id),
      deliveryIds: deliveries.map((d) => d.id),
      reconciliationImports,
      reconciliationTransactionIds,
      auditLogIds: auditLogs.map((a) => a.id),
      billingProfileIds: billingProfiles.map((p) => p.id),
      tenantLinkIds: tenantLinks.map((t) => t.id),
    },
    invoiceSequences,
    blockingErrors,
    auditCleanupDecision,
  };
}

export type CleanupExecuteResult = {
  deleted: {
    auditLogs: number;
    reconciliationImports: number;
    reconciliationTransactions: number;
    payments: number;
    paymentInstructions: number;
    deliveries: number;
    invoices: number;
    contract: number;
    billingProfiles: number;
    tenantLinks: number;
    customer: number;
  };
  invoiceSequencesUnchanged: boolean;
  invoiceSequenceBefore: InvoiceSequenceSnapshot[];
  invoiceSequenceAfter: InvoiceSequenceSnapshot[];
};

export async function executeCleanupTransaction(
  prisma: PrismaClient,
  inventory: CleanupInventory,
): Promise<CleanupExecuteResult> {
  if (inventory.blockingErrors.length > 0) {
    throw new Error(inventory.blockingErrors.join(" "));
  }

  const sequenceBefore = inventory.invoiceSequences.map((s) => ({ ...s }));
  const {
    synthetic: {
      customer,
      contract,
      invoices,
      paymentIds,
      paymentInstructionIds,
      deliveryIds,
      reconciliationImports,
      auditLogIds,
      billingProfileIds,
      tenantLinkIds,
    },
  } = inventory;

  const deletableImportIds = reconciliationImports
    .filter((i) => i.transactionIds.length > 0 && !i.mixedImportBlocked)
    .map((i) => i.id);

  const invoiceIds = invoices.map((i) => i.id);

  const result = await prisma.$transaction(async (tx) => {
    const auditDeleted = auditLogIds.length
      ? (
          await tx.auditLog.deleteMany({
            where: { id: { in: auditLogIds } },
          })
        ).count
      : 0;

    if (deletableImportIds.length > 0) {
      await tx.bankReconciliationImport.deleteMany({
        where: { id: { in: deletableImportIds } },
      });
    }

    const paymentsDeleted = paymentIds.length
      ? (await tx.invoicePayment.deleteMany({ where: { id: { in: paymentIds } } }))
          .count
      : 0;

    const instructionsDeleted = paymentInstructionIds.length
      ? (
          await tx.invoicePaymentInstruction.deleteMany({
            where: { id: { in: paymentInstructionIds } },
          })
        ).count
      : 0;

    const deliveriesDeleted = deliveryIds.length
      ? (await tx.invoiceDelivery.deleteMany({ where: { id: { in: deliveryIds } } }))
          .count
      : 0;

    const invoicesDeleted = invoiceIds.length
      ? (await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } })).count
      : 0;

    const contractDeleted =
      contract &&
      (await tx.billingContract.deleteMany({ where: { id: contract.id } })).count;

    const profilesDeleted = billingProfileIds.length
      ? (
          await tx.billingProfile.deleteMany({
            where: { id: { in: billingProfileIds } },
          })
        ).count
      : 0;

    const tenantLinksDeleted = tenantLinkIds.length
      ? (
          await tx.billingCustomerTenant.deleteMany({
            where: { id: { in: tenantLinkIds } },
          })
        ).count
      : 0;

    const customerDeleted =
      customer &&
      (await tx.billingCustomer.deleteMany({ where: { id: customer.id } })).count;

    const legalEntity = await tx.legalEntity.findUnique({
      where: { key: PROTECTED_LEGAL_ENTITY_KEY },
      select: { id: true },
    });
    if (!legalEntity) {
      throw new Error("Protected legal entity missing after cleanup — rollback.");
    }

    const fcaCustomer = await tx.billingCustomer.findUnique({
      where: { key: PROTECTED_FCA_CUSTOMER_KEY },
    });
    if (!fcaCustomer) {
      throw new Error("Protected FCA customer missing after cleanup — rollback.");
    }

    const sequenceAfter = legalEntity
      ? await tx.invoiceSequence.findMany({
          where: { legalEntityId: legalEntity.id },
          select: {
            legalEntityId: true,
            sequenceYear: true,
            lastNumber: true,
          },
        })
      : [];

    const sequencesMatch =
      sequenceBefore.length === sequenceAfter.length &&
      sequenceBefore.every((before) =>
        sequenceAfter.some(
          (after) =>
            after.sequenceYear === before.sequenceYear &&
            after.lastNumber === before.lastNumber,
        ),
      );

    if (!sequencesMatch) {
      throw new Error("Invoice sequence state changed — rollback.");
    }

    return {
      deleted: {
        auditLogs: auditDeleted,
        reconciliationImports: deletableImportIds.length,
        reconciliationTransactions: reconciliationImports.reduce(
          (sum, i) => sum + i.transactionIds.length,
          0,
        ),
        payments: paymentsDeleted,
        paymentInstructions: instructionsDeleted,
        deliveries: deliveriesDeleted,
        invoices: invoicesDeleted,
        contract: contractDeleted ? 1 : 0,
        billingProfiles: profilesDeleted,
        tenantLinks: tenantLinksDeleted,
        customer: customerDeleted ? 1 : 0,
      },
      invoiceSequencesUnchanged: sequencesMatch,
      invoiceSequenceBefore: sequenceBefore,
      invoiceSequenceAfter: sequenceAfter,
    };
  });

  return result;
}

export function inventoryHasSyntheticTargets(inventory: CleanupInventory): boolean {
  return Boolean(
    inventory.synthetic.customer ||
      inventory.synthetic.contract ||
      inventory.synthetic.invoices.length > 0 ||
      inventory.synthetic.paymentIds.length > 0 ||
      inventory.synthetic.reconciliationImports.some(
        (i) => i.transactionIds.length > 0,
      ),
  );
}
