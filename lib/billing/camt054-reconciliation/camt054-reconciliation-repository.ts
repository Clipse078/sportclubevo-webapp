import type {
  BankReconciliationImport,
  BankReconciliationImportStatus,
  BankReconciliationTransaction,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type BankReconciliationImportListRow = BankReconciliationImport;

export async function findBankReconciliationImportByKey(
  importKey: string,
): Promise<BankReconciliationImport | null> {
  return prisma.bankReconciliationImport.findUnique({ where: { key: importKey } });
}

export async function findBankReconciliationImportByContentHash(
  legalEntityId: string,
  contentSha256: string,
): Promise<BankReconciliationImport | null> {
  return prisma.bankReconciliationImport.findUnique({
    where: { legalEntityId_contentSha256: { legalEntityId, contentSha256 } },
  });
}

export async function listBankReconciliationImportsForLegalEntity(
  legalEntityId: string,
  limit = 50,
): Promise<BankReconciliationImportListRow[]> {
  return prisma.bankReconciliationImport.findMany({
    where: { legalEntityId },
    orderBy: { uploadedAt: "desc" },
    take: limit,
  });
}

export async function listBankReconciliationTransactionsForImport(
  importId: string,
): Promise<BankReconciliationTransaction[]> {
  return prisma.bankReconciliationTransaction.findMany({
    where: { importId },
    orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
  });
}

export async function findBankReconciliationTransactionByKey(
  transactionKey: string,
): Promise<
  | (BankReconciliationTransaction & {
      import: BankReconciliationImport;
    })
  | null
> {
  return prisma.bankReconciliationTransaction.findUnique({
    where: { key: transactionKey },
    include: { import: true },
  });
}

export async function createBankReconciliationImportWithTransactions(
  data: Prisma.BankReconciliationImportCreateInput,
  transactions: Prisma.BankReconciliationTransactionCreateWithoutImportInput[],
): Promise<BankReconciliationImport> {
  return prisma.bankReconciliationImport.create({
    data: {
      ...data,
      transactions: { create: transactions },
    },
  });
}

export function deriveImportStatus(counts: {
  matchedCount: number;
  unmatchedCount: number;
  reviewRequiredCount: number;
  duplicateCount: number;
  errorCount: number;
  transactionCount: number;
}): BankReconciliationImportStatus {
  if (counts.transactionCount === 0) {
    return "FAILED";
  }
  if (counts.errorCount > 0 && counts.matchedCount === 0) {
    return "FAILED";
  }
  if (
    counts.unmatchedCount > 0 ||
    counts.reviewRequiredCount > 0 ||
    counts.errorCount > 0
  ) {
    return "PARTIAL";
  }
  return "COMPLETED";
}
