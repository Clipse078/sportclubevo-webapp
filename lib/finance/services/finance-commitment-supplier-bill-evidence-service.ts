import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { auditFinanceCommitmentLifecycle } from "@/lib/finance/audit/finance-commitment-audit";
import { canManageFinanceCommitments } from "@/lib/finance/commitment/finance-commitment-authorization";
import {
  FINANCE_SUPPLIER_BILL_EVIDENCE_SCOPE,
  normalizeSupplierBillExternalReference,
} from "@/lib/finance/commitment/finance-supplier-bill-evidence-contract";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

type Db = Pick<PrismaClient, "financeCommitment" | "financeEconomicEvidenceLink" | "user" | "auditLog">;

export type FinanceSupplierBillEvidenceLinkRecord = {
  id: string;
  externalReference: string;
  amountMinorSnapshot: number | null;
  linkedAtIso: string;
  linkedByDisplayName: string | null;
};

async function getCommitmentOrThrow(db: Db, ctx: FinanceAuthContext, commitmentId: string) {
  const row = await db.financeCommitment.findFirst({
    where: { id: commitmentId, tenantId: ctx.tenantId },
    select: {
      id: true,
      tenantId: true,
      economicObligationKey: true,
      lifecycleStatus: true,
    },
  });
  if (!row) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Commitment not found.", 404);
  }
  return row;
}

function assertMayLinkSupplierBillEvidence(lifecycleStatus: string): void {
  if (lifecycleStatus === "CANCELLED") {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_INVALID_STATE",
      "Supplier bill evidence cannot be linked to a cancelled commitment.",
      409,
    );
  }
}

export async function listSupplierBillEvidenceForCommitment(
  db: Db,
  ctx: FinanceAuthContext,
  commitmentId: string,
): Promise<FinanceSupplierBillEvidenceLinkRecord[]> {
  const commitment = await getCommitmentOrThrow(db, ctx, commitmentId);
  const rows = await db.financeEconomicEvidenceLink.findMany({
    where: {
      tenantId: ctx.tenantId,
      economicObligationKey: commitment.economicObligationKey,
      evidenceKind: FINANCE_SUPPLIER_BILL_EVIDENCE_SCOPE.evidenceKind,
      evidenceRefType: FINANCE_SUPPLIER_BILL_EVIDENCE_SCOPE.evidenceRefType,
    },
    orderBy: { linkedAt: "asc" },
    select: {
      id: true,
      evidenceRefId: true,
      amountMinorSnapshot: true,
      linkedAt: true,
      linkedByUserId: true,
    },
  });

  const userIds = [...new Set(rows.map((r) => r.linkedByUserId).filter(Boolean))] as string[];
  const users =
    userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
  const userName = new Map(
    users.map((u) => [
      u.id,
      [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.id,
    ]),
  );

  return rows.map((row) => ({
    id: row.id,
    externalReference: row.evidenceRefId,
    amountMinorSnapshot: row.amountMinorSnapshot,
    linkedAtIso: row.linkedAt.toISOString(),
    linkedByDisplayName: row.linkedByUserId
      ? (userName.get(row.linkedByUserId) ?? null)
      : null,
  }));
}

export async function linkSupplierBillExternalReferenceToCommitment(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    commitmentId: string;
    externalReference: string;
    amountMinorSnapshot?: number | null;
  },
): Promise<{ linkId: string }> {
  if (!canManageFinanceCommitments(ctx)) {
    throw new FinanceDomainError("FINANCE_FORBIDDEN", "Insufficient permission.", 403);
  }

  const commitment = await getCommitmentOrThrow(db, ctx, input.commitmentId);
  assertMayLinkSupplierBillEvidence(commitment.lifecycleStatus);

  let externalReference: string;
  try {
    externalReference = normalizeSupplierBillExternalReference(input.externalReference);
  } catch {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_VALIDATION",
      "Supplier bill reference is required and must be shorter than 200 characters.",
      400,
    );
  }

  let amountMinorSnapshot: number | null = null;
  if (input.amountMinorSnapshot != null) {
    assertSafeAmountMinor(input.amountMinorSnapshot);
    amountMinorSnapshot = input.amountMinorSnapshot;
  }

  try {
    const created = await db.financeEconomicEvidenceLink.create({
      data: {
        tenantId: ctx.tenantId,
        economicObligationKey: commitment.economicObligationKey,
        evidenceKind: FINANCE_SUPPLIER_BILL_EVIDENCE_SCOPE.evidenceKind,
        evidenceRefType: FINANCE_SUPPLIER_BILL_EVIDENCE_SCOPE.evidenceRefType,
        evidenceRefId: externalReference,
        amountMinorSnapshot,
        linkedByUserId: ctx.userId,
      },
    });

    await auditFinanceCommitmentLifecycle(db, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      commitmentId: commitment.id,
      action: "EVIDENCE_LINKED",
      metadataJson: {
        evidenceKind: FINANCE_SUPPLIER_BILL_EVIDENCE_SCOPE.evidenceKind,
        evidenceRefType: FINANCE_SUPPLIER_BILL_EVIDENCE_SCOPE.evidenceRefType,
        evidenceRefId: externalReference,
        linkOnly: true,
      },
    });

    return { linkId: created.id };
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code: string }).code
        : undefined;
    if (code === "P2002") {
      throw new FinanceDomainError(
        "FINANCE_SUPPLIER_BILL_ALREADY_LINKED",
        "This supplier bill reference is already linked for this tenant.",
        409,
      );
    }
    throw error;
  }
}
