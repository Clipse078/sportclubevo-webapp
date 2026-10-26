import { randomUUID } from "node:crypto";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export const commitmentTenantA = "tenant-commit-a";
export const commitmentTenantB = "tenant-commit-b";
export const commitmentYearId = "year-2026";

export function commitmentCtx(
  overrides?: Partial<FinanceAuthContext>,
): FinanceAuthContext {
  return {
    tenantId: commitmentTenantA,
    userId: "user-1",
    permissionKeys: new Set([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_COMMITMENT_VIEW,
      PERMISSIONS.FINANCE_COMMITMENT_MANAGE,
      PERMISSIONS.FINANCE_COMMITMENT_SUBMIT,
    ]),
    ...overrides,
  };
}

type CommitmentRow = {
  id: string;
  tenantId: string;
  financeYearId: string;
  economicObligationKey: string;
  lifecycleStatus: string;
  approvalStatus: string;
  title: string;
  description: string | null;
  externalReference: string | null;
  amountMinor: number;
  currency: string;
  financialAccountId: string | null;
  costCenterId: string | null;
  partyName: string | null;
  partyReference: string | null;
  commitmentDate: Date;
  expectedEvidenceDate: Date | null;
  expectedPaymentDate: Date | null;
  responsibleUserId: string | null;
  requestedByUserId: string | null;
  submittedAt: Date | null;
  approvalDecidedAt: Date | null;
  approvalDecidedByUserId: string | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function createCommitmentMockStore() {
  return {
    financeYear: [
      {
        id: commitmentYearId,
        tenantId: commitmentTenantA,
        name: "2026",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T00:00:00.000Z"),
      },
    ],
    financeConfiguration: [
      { tenantId: commitmentTenantA, baseCurrency: "EUR", currentFinanceYearId: commitmentYearId },
    ],
    financialAccount: [
      {
        id: "acc-expense",
        tenantId: commitmentTenantA,
        name: "Equipment",
        canonicalSemantic: "EXPENSE" as const,
        lifecycle: "ACTIVE" as const,
      },
    ],
    financeCostCenter: [] as Array<{ id: string; tenantId: string; name: string }>,
    financeCommitment: [] as CommitmentRow[],
    financeEconomicEvidenceLink: [] as Array<{
      id: string;
      tenantId: string;
      economicObligationKey: string;
      evidenceKind: string;
      evidenceRefType: string;
      evidenceRefId: string;
      amountMinorSnapshot: number | null;
      linkedByUserId: string | null;
    }>,
    financeCommitmentApprovalDecision: [] as Array<Record<string, unknown>>,
    auditLog: [] as Array<Record<string, unknown>>,
    user: [] as Array<{ id: string; firstName: string; lastName: string }>,
  };
}

export function makeCommitmentMockDb(store: ReturnType<typeof createCommitmentMockStore>) {
  let seq = 0;
  const nextId = () => `cmt_${++seq}`;

  return {
    financeYear: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeYear.find((y) => y.id === where.id) ?? null,
      findMany: async ({ where }: { where: { tenantId: string } }) =>
        store.financeYear.filter((y) => y.tenantId === where.tenantId),
    },
    financeConfiguration: {
      findUnique: async ({ where }: { where: { tenantId: string } }) =>
        store.financeConfiguration.find((c) => c.tenantId === where.tenantId) ?? null,
    },
    financialAccount: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financialAccount.find((a) => a.id === where.id) ?? null,
      findMany: async ({ where }: { where: { id?: { in: string[] }; tenantId?: string } }) => {
        let rows = store.financialAccount;
        if (where.tenantId) rows = rows.filter((a) => a.tenantId === where.tenantId);
        if (where.id?.in) rows = rows.filter((a) => where.id!.in.includes(a.id));
        return rows;
      },
    },
    financeCostCenter: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeCostCenter.find((c) => c.id === where.id) ?? null,
    },
    user: {
      findMany: async () => store.user,
      findUnique: async () => null,
    },
    financeCommitment: {
      create: async ({ data }: { data: Omit<CommitmentRow, "id" | "createdAt" | "updatedAt"> }) => {
        const row: CommitmentRow = {
          ...data,
          id: nextId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.financeCommitment.push(row);
        return row;
      },
      findFirst: async ({
        where,
      }: {
        where: { id?: string; tenantId?: string };
      }) =>
        store.financeCommitment.find(
          (c) =>
            (!where.id || c.id === where.id) &&
            (!where.tenantId || c.tenantId === where.tenantId),
        ) ?? null,
      findMany: async ({
        where,
        skip,
        take,
      }: {
        where: Record<string, unknown>;
        skip?: number;
        take?: number;
      }) => {
        let rows = store.financeCommitment.filter((c) => c.tenantId === where.tenantId);
        if (where.financeYearId) {
          rows = rows.filter((c) => c.financeYearId === where.financeYearId);
        }
        if (where.lifecycleStatus) {
          rows = rows.filter((c) => c.lifecycleStatus === where.lifecycleStatus);
        }
        if (where.approvalStatus) {
          rows = rows.filter((c) => c.approvalStatus === where.approvalStatus);
        }
        const slice = rows.slice(skip ?? 0, (skip ?? 0) + (take ?? rows.length));
        return slice.map((c) => ({
          ...c,
          financeYear: { name: "2026" },
        }));
      },
      count: async ({ where }: { where: Record<string, unknown> }) => {
        let rows = store.financeCommitment.filter((c) => c.tenantId === where.tenantId);
        if (where.lifecycleStatus) {
          rows = rows.filter((c) => c.lifecycleStatus === where.lifecycleStatus);
        }
        if (where.approvalStatus) {
          rows = rows.filter((c) => c.approvalStatus === where.approvalStatus);
        }
        if (where.financeYearId) {
          rows = rows.filter((c) => c.financeYearId === where.financeYearId);
        }
        return rows.length;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<CommitmentRow>;
      }) => {
        const row = store.financeCommitment.find((c) => c.id === where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const idx = store.financeCommitment.findIndex((c) => c.id === where.id);
        if (idx >= 0) store.financeCommitment.splice(idx, 1);
        return { id: where.id };
      },
      groupBy: async () => [],
    },
    financeEconomicEvidenceLink: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), ...data };
        store.financeEconomicEvidenceLink.push(row as never);
        return row;
      },
      deleteMany: async ({
        where,
      }: {
        where: { tenantId: string; evidenceRefType: string; evidenceRefId: string };
      }) => {
        store.financeEconomicEvidenceLink = store.financeEconomicEvidenceLink.filter(
          (l) =>
            !(
              l.tenantId === where.tenantId &&
              l.evidenceRefType === where.evidenceRefType &&
              l.evidenceRefId === where.evidenceRefId
            ),
        );
        return { count: 1 };
      },
    },
    financeCommitmentApprovalDecision: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        store.financeCommitmentApprovalDecision.push(data);
        return data;
      },
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        store.auditLog.push(data);
        return data;
      },
    },
  };
}
