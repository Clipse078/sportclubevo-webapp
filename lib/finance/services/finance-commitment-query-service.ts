import type { Prisma, PrismaClient } from "@prisma/client";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  canManageFinanceCommitments,
  canSubmitFinanceCommitments,
  canViewFinanceCommitments,
  requireFinanceCommitmentFoundationView,
} from "@/lib/finance/commitment/finance-commitment-authorization";
import { FinanceDomainError } from "@/lib/finance/errors";
import { loadFinanceSetupSnapshot } from "@/lib/finance/services/finance-configuration-service";

type Db = Pick<
  PrismaClient,
  | "financeCommitment"
  | "financeYear"
  | "financialAccount"
  | "financeCostCenter"
  | "user"
>;

export type FinanceCommitmentListItem = {
  id: string;
  title: string;
  amountMinor: number;
  currency: string;
  partyName: string | null;
  lifecycleStatus: string;
  approvalStatus: string;
  responsibleUserId: string | null;
  responsibleDisplayName: string | null;
  expectedPaymentDateIso: string | null;
  commitmentDateIso: string;
  financialAccountName: string | null;
  financeYearId: string;
  financeYearName: string;
  updatedAtIso: string;
};

export type FinanceCommitmentWorkspaceSnapshot = {
  capabilities: {
    canView: boolean;
    canManage: boolean;
    canSubmit: boolean;
  };
  summary: {
    draftCount: number;
    submittedPendingCount: number;
    activeCount: number;
    activeAmountMinor: number | null;
    activeAmountCurrency: string | null;
  };
  years: { id: string; name: string }[];
  selectedYearId: string | null;
  baseCurrency: string | null;
  items: FinanceCommitmentListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  filters: {
    lifecycleStatus: string | null;
    approvalStatus: string | null;
    responsibleUserId: string | null;
    search: string | null;
  };
};

export type FinanceCommitmentDetailRecord = FinanceCommitmentListItem & {
  financialAccountId: string | null;
  description: string | null;
  externalReference: string | null;
  costCenterName: string | null;
  expectedEvidenceDateIso: string | null;
  submittedAtIso: string | null;
  cancelledAtIso: string | null;
  lifecycleStatus: string;
  approvalStatus: string;
  canEdit: boolean;
  canSubmit: boolean;
  canCancel: boolean;
};

const DEFAULT_PAGE_SIZE = 25;

function dateToIso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function buildListWhere(
  tenantId: string,
  input: {
    financeYearId?: string | null;
    lifecycleStatus?: string | null;
    approvalStatus?: string | null;
    responsibleUserId?: string | null;
    search?: string | null;
  },
): Prisma.FinanceCommitmentWhereInput {
  const where: Prisma.FinanceCommitmentWhereInput = { tenantId };
  if (input.financeYearId) where.financeYearId = input.financeYearId;
  if (input.lifecycleStatus) {
    where.lifecycleStatus = input.lifecycleStatus as Prisma.EnumFinanceCommitmentLifecycleStatusFilter;
  }
  if (input.approvalStatus) {
    where.approvalStatus = input.approvalStatus as Prisma.EnumFinanceCommitmentApprovalStatusFilter;
  }
  if (input.responsibleUserId) where.responsibleUserId = input.responsibleUserId;
  if (input.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { partyName: { contains: q, mode: "insensitive" } },
      { externalReference: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

async function mapListRows(
  db: Db,
  rows: Array<{
    id: string;
    title: string;
    amountMinor: number;
    currency: string;
    partyName: string | null;
    lifecycleStatus: string;
    approvalStatus: string;
    responsibleUserId: string | null;
    expectedPaymentDate: Date | null;
    commitmentDate: Date;
    financeYearId: string;
    updatedAt: Date;
    financialAccountId: string | null;
    financeYear: { name: string };
  }>,
): Promise<FinanceCommitmentListItem[]> {
  const accountIds = [...new Set(rows.map((r) => r.financialAccountId).filter(Boolean))] as string[];
  const userIds = [...new Set(rows.map((r) => r.responsibleUserId).filter(Boolean))] as string[];

  const [accounts, users] = await Promise.all([
    accountIds.length
      ? db.financialAccount.findMany({
          where: { id: { in: accountIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    userIds.length
      ? db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve([]),
  ]);

  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const userName = new Map(
    users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.id]),
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    amountMinor: row.amountMinor,
    currency: row.currency,
    partyName: row.partyName,
    lifecycleStatus: row.lifecycleStatus,
    approvalStatus: row.approvalStatus,
    responsibleUserId: row.responsibleUserId,
    responsibleDisplayName: row.responsibleUserId
      ? (userName.get(row.responsibleUserId) ?? null)
      : null,
    expectedPaymentDateIso: dateToIso(row.expectedPaymentDate),
    commitmentDateIso: dateToIso(row.commitmentDate) ?? "",
    financialAccountName: row.financialAccountId
      ? (accountName.get(row.financialAccountId) ?? null)
      : null,
    financeYearId: row.financeYearId,
    financeYearName: row.financeYear.name,
    updatedAtIso: row.updatedAt.toISOString(),
  }));
}

export async function loadFinanceCommitmentWorkspaceSnapshot(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    financeYearId?: string | null;
    page?: number;
    lifecycleStatus?: string | null;
    approvalStatus?: string | null;
    responsibleUserId?: string | null;
    search?: string | null;
  },
): Promise<FinanceCommitmentWorkspaceSnapshot> {
  requireFinanceCommitmentFoundationView(ctx);

  const [setup, yearsRows] = await Promise.all([
    loadFinanceSetupSnapshot(db as never, ctx),
    db.financeYear.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true },
    }),
  ]);
  const years = yearsRows.map((y) => ({ id: y.id, name: y.name }));
  const selectedYearId =
    input.financeYearId ??
    setup.configuration?.currentFinanceYearId ??
    years[0]?.id ??
    null;
  const baseCurrency = setup.configuration?.baseCurrency ?? null;

  const page = Math.max(1, input.page ?? 1);
  const pageSize = DEFAULT_PAGE_SIZE;
  const where = buildListWhere(ctx.tenantId, {
    financeYearId: selectedYearId,
    lifecycleStatus: input.lifecycleStatus,
    approvalStatus: input.approvalStatus,
    responsibleUserId: input.responsibleUserId,
    search: input.search,
  });

  const [totalCount, rows, draftCount, submittedPendingCount, activeCount, activeAgg] =
    await Promise.all([
    db.financeCommitment.count({ where }),
    db.financeCommitment.findMany({
      where,
      orderBy: [
        { lifecycleStatus: "asc" },
        { expectedPaymentDate: "asc" },
        { updatedAt: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { financeYear: { select: { name: true } } },
    }),
    db.financeCommitment.count({
      where: { tenantId: ctx.tenantId, lifecycleStatus: "DRAFT", ...(selectedYearId ? { financeYearId: selectedYearId } : {}) },
    }),
    db.financeCommitment.count({
      where: {
        tenantId: ctx.tenantId,
        lifecycleStatus: "SUBMITTED",
        approvalStatus: "PENDING",
        ...(selectedYearId ? { financeYearId: selectedYearId } : {}),
      },
    }),
    db.financeCommitment.count({
      where: {
        tenantId: ctx.tenantId,
        lifecycleStatus: "ACTIVE",
        ...(selectedYearId ? { financeYearId: selectedYearId } : {}),
      },
    }),
    db.financeCommitment.groupBy({
      by: ["currency"],
      where: {
        tenantId: ctx.tenantId,
        lifecycleStatus: "ACTIVE",
        ...(selectedYearId ? { financeYearId: selectedYearId } : {}),
      },
      _sum: { amountMinor: true },
    }),
  ]);

  let activeAmountMinor: number | null = null;
  let activeAmountCurrency: string | null = null;
  if (activeAgg.length === 1) {
    activeAmountMinor = activeAgg[0]?._sum.amountMinor ?? 0;
    activeAmountCurrency = activeAgg[0]?.currency ?? null;
  }

  const items = await mapListRows(db, rows);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    capabilities: {
      canView: canViewFinanceCommitments(ctx),
      canManage: canManageFinanceCommitments(ctx),
      canSubmit: canSubmitFinanceCommitments(ctx),
    },
    summary: {
      draftCount,
      submittedPendingCount,
      activeCount,
      activeAmountMinor,
      activeAmountCurrency,
    },
    years,
    selectedYearId,
    baseCurrency,
    items,
    pagination: { page, pageSize, totalCount, totalPages },
    filters: {
      lifecycleStatus: input.lifecycleStatus ?? null,
      approvalStatus: input.approvalStatus ?? null,
      responsibleUserId: input.responsibleUserId ?? null,
      search: input.search ?? null,
    },
  };
}

export async function getFinanceCommitmentDetail(
  db: Db,
  ctx: FinanceAuthContext,
  commitmentId: string,
): Promise<FinanceCommitmentDetailRecord> {
  requireFinanceCommitmentFoundationView(ctx);

  const row = await db.financeCommitment.findFirst({
    where: { id: commitmentId, tenantId: ctx.tenantId },
    include: {
      financeYear: { select: { name: true } },
    },
  });
  if (!row) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Commitment not found.", 404);
  }

  const [account, costCenter, responsible] = await Promise.all([
    row.financialAccountId
      ? db.financialAccount.findUnique({
          where: { id: row.financialAccountId },
          select: { name: true },
        })
      : Promise.resolve(null),
    row.costCenterId
      ? db.financeCostCenter.findUnique({
          where: { id: row.costCenterId },
          select: { name: true },
        })
      : Promise.resolve(null),
    row.responsibleUserId
      ? db.user.findUnique({
          where: { id: row.responsibleUserId },
          select: { firstName: true, lastName: true },
        })
      : Promise.resolve(null),
  ]);

  const listBase = (
    await mapListRows(db, [
      {
        ...row,
        financeYear: row.financeYear,
      },
    ])
  )[0]!;

  const canEdit = row.lifecycleStatus === "DRAFT" && canManageFinanceCommitments(ctx);
  const canSubmit =
    row.lifecycleStatus === "DRAFT" && canSubmitFinanceCommitments(ctx);
  const canCancel =
    canManageFinanceCommitments(ctx) &&
    (row.lifecycleStatus === "DRAFT" ||
      row.lifecycleStatus === "SUBMITTED" ||
      row.lifecycleStatus === "ACTIVE");

  return {
    ...listBase,
    financialAccountId: row.financialAccountId,
    description: row.description,
    externalReference: row.externalReference,
    costCenterName: costCenter?.name ?? null,
    expectedEvidenceDateIso: dateToIso(row.expectedEvidenceDate),
    submittedAtIso: row.submittedAt?.toISOString() ?? null,
    cancelledAtIso: row.cancelledAt?.toISOString() ?? null,
    canEdit,
    canSubmit,
    canCancel,
  };
}
