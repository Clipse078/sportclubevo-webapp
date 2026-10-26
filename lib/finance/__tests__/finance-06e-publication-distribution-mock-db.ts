import { randomUUID } from "node:crypto";
import {
  createPublicationShareMockStore,
  makePublicationShareMockPrisma,
  type PublicationShareMockStore,
} from "@/lib/finance/__tests__/finance-06d-publication-share-mock-db";

type DistributionRow = {
  id: string;
  tenantId: string;
  publicationId: string;
  publicationVersionId: string;
  createdByUserId: string | null;
  optionalMessage: string | null;
  status: string;
  idempotencyKey: string;
  localeCode: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

type DistributionRecipientRow = {
  id: string;
  tenantId: string;
  distributionId: string;
  personId: string | null;
  recipientEmail: string;
  recipientDisplayName: string | null;
  isExternalRecipient: boolean;
  publicationShareId: string | null;
  status: string;
  sentAt: Date | null;
  failedAt: Date | null;
  failureCode: string | null;
  deliveryMetadataJson: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicationDistributionMockStore = PublicationShareMockStore & {
  financePublicationDistribution: DistributionRow[];
  financePublicationDistributionRecipient: DistributionRecipientRow[];
  person: Array<{
    id: string;
    tenantId: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    email: string | null;
    isActive: boolean;
  }>;
  tenant: Array<{ id: string; name: string }>;
  user: Array<{ id: string; firstName: string; lastName: string }>;
};

export function createPublicationDistributionMockStore(): PublicationDistributionMockStore {
  return {
    ...createPublicationShareMockStore(),
    financePublicationDistribution: [],
    financePublicationDistributionRecipient: [],
    person: [],
    tenant: [],
    user: [],
  };
}

export function makePublicationDistributionMockPrisma(store: PublicationDistributionMockStore) {
  const base = makePublicationShareMockPrisma(store) as Record<string, unknown>;
  const db = {
    ...base,
    tenant: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.tenant.find((row) => row.id === where.id) ?? null,
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.user.find((row) => row.id === where.id) ?? null,
      findFirst: async () => null,
    },
    person: {
      findFirst: async ({
        where,
        select,
      }: {
        where: { id?: string; tenantId?: string; isActive?: boolean };
        select?: unknown;
      }) => {
        const row = store.person.find(
          (p) =>
            (!where.id || p.id === where.id) &&
            (!where.tenantId || p.tenantId === where.tenantId) &&
            (where.isActive === undefined || p.isActive === where.isActive),
        );
        if (!row) return null;
        if (!select) return row;
        return row;
      },
    },
    financePublicationDistribution: {
      findFirst: async ({ where, include }: { where: Record<string, unknown>; include?: unknown }) => {
        const row = store.financePublicationDistribution.find((d) => {
          if (where.id && d.id !== where.id) return false;
          if (where.tenantId && d.tenantId !== where.tenantId) return false;
          if (where.idempotencyKey && d.idempotencyKey !== where.idempotencyKey) return false;
          return true;
        });
        if (!row) return null;
        if (include) {
          return {
            ...row,
            recipients: store.financePublicationDistributionRecipient.filter(
              (r) => r.distributionId === row.id,
            ),
          };
        }
        return row;
      },
      create: async ({ data }: { data: Partial<DistributionRow> }) => {
        const row: DistributionRow = {
          id: randomUUID(),
          tenantId: data.tenantId!,
          publicationId: data.publicationId!,
          publicationVersionId: data.publicationVersionId!,
          createdByUserId: data.createdByUserId ?? null,
          optionalMessage: data.optionalMessage ?? null,
          status: data.status ?? "PENDING",
          idempotencyKey: data.idempotencyKey!,
          localeCode: data.localeCode ?? "en",
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
        };
        store.financePublicationDistribution.push(row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<DistributionRow>;
      }) => {
        const row = store.financePublicationDistribution.find((d) => d.id === where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      findMany: async ({
        where,
        orderBy,
        take,
        include,
      }: {
        where: Record<string, unknown>;
        orderBy?: { createdAt: "desc" };
        take?: number;
        include?: unknown;
      }) => {
        let rows = store.financePublicationDistribution.filter((d) => {
          if (where.tenantId && d.tenantId !== where.tenantId) return false;
          if (where.publicationVersionId && d.publicationVersionId !== where.publicationVersionId) {
            return false;
          }
          if (
            where.createdAt &&
            typeof where.createdAt === "object" &&
            "lt" in where.createdAt
          ) {
            const lt = (where.createdAt as { lt: Date }).lt;
            if (!(d.createdAt < lt)) return false;
          }
          return true;
        });
        if (orderBy?.createdAt === "desc") {
          rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        if (take != null) rows = rows.slice(0, take);
        if (include) {
          return rows.map((row) => ({
            ...row,
            recipients: store.financePublicationDistributionRecipient.filter(
              (r) => r.distributionId === row.id,
            ),
            publicationVersion: store.financePublicationVersion.find(
              (v) => v.id === row.publicationVersionId,
            ),
          }));
        }
        return rows;
      },
    },
    financePublicationDistributionRecipient: {
      create: async ({ data }: { data: Partial<DistributionRecipientRow> }) => {
        const row: DistributionRecipientRow = {
          id: randomUUID(),
          tenantId: data.tenantId!,
          distributionId: data.distributionId!,
          personId: data.personId ?? null,
          recipientEmail: data.recipientEmail!,
          recipientDisplayName: data.recipientDisplayName ?? null,
          isExternalRecipient: data.isExternalRecipient ?? false,
          publicationShareId: data.publicationShareId ?? null,
          status: data.status ?? "PENDING",
          sentAt: null,
          failedAt: null,
          failureCode: null,
          deliveryMetadataJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.financePublicationDistributionRecipient.push(row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<DistributionRecipientRow>;
      }) => {
        const row = store.financePublicationDistributionRecipient.find((r) => r.id === where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    $transaction: async <T>(fn: (tx: typeof db) => Promise<T>) => fn(db),
  };
  return db as unknown as import("@prisma/client").PrismaClient;
}
