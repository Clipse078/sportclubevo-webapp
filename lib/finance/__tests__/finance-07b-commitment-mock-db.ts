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
  approvalPolicyEnabledSnapshot: boolean | null;
  approvalThresholdMinorSnapshot: number | null;
  approvalPolicyCurrencySnapshot: string | null;
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
    financeCommitmentApprovalPolicy: [] as Array<{
      id: string;
      tenantId: string;
      enabled: boolean;
      thresholdAmountMinor: number;
      thresholdCurrency: string;
      updatedByUserId: string | null;
    }>,
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
      count: async ({ where }: { where: { tenantId: string } }) =>
        store.financeYear.filter((y) => y.tenantId === where.tenantId).length,
    },
    financeTenantCapability: {
      count: async () => 1,
    },
    financeConfiguration: {
      findUnique: async ({ where }: { where: { tenantId: string } }) =>
        store.financeConfiguration.find((c) => c.tenantId === where.tenantId) ?? null,
    },
    financeCommitmentApprovalPolicy: {
      findUnique: async ({ where }: { where: { tenantId: string } }) =>
        store.financeCommitmentApprovalPolicy.find((p) => p.tenantId === where.tenantId) ?? null,
      create: async ({
        data,
      }: {
        data: {
          tenantId: string;
          enabled: boolean;
          thresholdAmountMinor: number;
          thresholdCurrency: string;
          updatedByUserId: string | null;
        };
      }) => {
        const row = { id: `policy_${++seq}`, ...data };
        store.financeCommitmentApprovalPolicy.push(row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<{
          enabled: boolean;
          thresholdAmountMinor: number;
          thresholdCurrency: string;
          updatedByUserId: string | null;
        }>;
      }) => {
        const row = store.financeCommitmentApprovalPolicy.find((p) => p.id === where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return row;
      },
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
          approvalPolicyEnabledSnapshot: null,
          approvalThresholdMinorSnapshot: null,
          approvalPolicyCurrencySnapshot: null,
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
        include,
      }: {
        where: { id?: string; tenantId?: string };
        include?: { financeYear?: { select: { name: true } } };
      }) => {
        const row = store.financeCommitment.find(
          (c) =>
            (!where.id || c.id === where.id) &&
            (!where.tenantId || c.tenantId === where.tenantId),
        );
        if (!row) return null;
        if (include?.financeYear) {
          return { ...row, financeYear: { name: "2026" } };
        }
        return row;
      },
      findMany: async ({
        where,
        skip,
        take,
        orderBy,
      }: {
        where: Record<string, unknown>;
        skip?: number;
        take?: number;
        orderBy?: Array<Record<string, string>>;
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
        if (orderBy?.some((o) => o.submittedAt)) {
          rows = [...rows].sort(
            (a, b) =>
              (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0),
          );
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
      updateMany: async ({
        where,
        data,
      }: {
        where: {
          id?: string;
          tenantId?: string;
          lifecycleStatus?: string;
          approvalStatus?: string;
        };
        data: Partial<CommitmentRow>;
      }) => {
        let count = 0;
        for (const row of store.financeCommitment) {
          if (where.id && row.id !== where.id) continue;
          if (where.tenantId && row.tenantId !== where.tenantId) continue;
          if (where.lifecycleStatus && row.lifecycleStatus !== where.lifecycleStatus) continue;
          if (where.approvalStatus && row.approvalStatus !== where.approvalStatus) continue;
          Object.assign(row, data, { updatedAt: new Date() });
          count += 1;
        }
        return { count };
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
        const row = { id: randomUUID(), decidedAt: new Date(), ...data };
        store.financeCommitmentApprovalDecision.push(row);
        return row;
      },
      findMany: async (args: {
        where: { tenantId?: string; commitmentId?: string };
        orderBy?: { decidedAt: "asc" | "desc" };
        take?: number;
        select?: {
          decision?: boolean;
          comment?: boolean;
          decidedAt?: boolean;
          decidedByUserId?: boolean;
          commitment?: { select: Record<string, unknown> };
        };
      }) => {
        const { where, orderBy, take, select } = args;
        let rows = store.financeCommitmentApprovalDecision.filter(
          (d) => !where.tenantId || d.tenantId === where.tenantId,
        );
        if (where.commitmentId) {
          rows = rows.filter((d) => d.commitmentId === where.commitmentId);
        }
        if (orderBy?.decidedAt === "asc") {
          rows = [...rows].sort(
            (a, b) =>
              new Date(String(a.decidedAt)).getTime() - new Date(String(b.decidedAt)).getTime(),
          );
        }
        if (orderBy?.decidedAt === "desc") {
          rows = [...rows].sort(
            (a, b) =>
              new Date(String(b.decidedAt)).getTime() - new Date(String(a.decidedAt)).getTime(),
          );
        }
        if (take != null) rows = rows.slice(0, take);
        if (select?.commitment) {
          return rows.map((d) => {
            const commitment = store.financeCommitment.find((c) => c.id === d.commitmentId);
            return {
              decision: d.decision,
              comment: d.comment ?? null,
              decidedAt: d.decidedAt,
              decidedByUserId: d.decidedByUserId,
              commitment: commitment
                ? {
                    ...commitment,
                    financeYear: { name: "2026" },
                  }
                : null,
            };
          });
        }
        return rows;
      },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = makeCommitmentMockDb(store);
      return fn(tx);
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        store.auditLog.push(data);
        return data;
      },
    },
  };
}
