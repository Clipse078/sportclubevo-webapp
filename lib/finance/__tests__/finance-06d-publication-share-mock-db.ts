import { randomUUID } from "node:crypto";
import {
  createPublicationMockStore,
  makePublicationMockPrisma,
  type PublicationMockStore,
} from "@/lib/finance/__tests__/finance-06b-publication-mock-db";

type ShareRow = {
  id: string;
  tenantId: string;
  publicationId: string;
  publicationVersionId: string;
  tokenHash: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedByUserId: string | null;
  createdByUserId: string | null;
  lastAccessedAt: Date | null;
  accessCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicationShareMockStore = PublicationMockStore & {
  financePublicationShare: ShareRow[];
  auditLog: Array<Record<string, unknown>>;
};

export function createPublicationShareMockStore(): PublicationShareMockStore {
  return {
    ...createPublicationMockStore(),
    financePublicationShare: [],
    auditLog: [],
  };
}

export function makePublicationShareMockPrisma(store: PublicationShareMockStore) {
  const base = makePublicationMockPrisma(store) as Record<string, unknown>;
  const db = {
    ...base,
    financePublicationShare: {
      create: async ({
        data,
        select,
      }: {
        data: Partial<ShareRow> & {
          publicationVersion?: { select: { versionNumber: true } };
        };
        select?: unknown;
      }) => {
        const row: ShareRow = {
          id: randomUUID(),
          tenantId: data.tenantId!,
          publicationId: data.publicationId!,
          publicationVersionId: data.publicationVersionId!,
          tokenHash: data.tokenHash!,
          expiresAt: data.expiresAt ?? null,
          revokedAt: null,
          revokedByUserId: null,
          createdByUserId: data.createdByUserId ?? null,
          lastAccessedAt: null,
          accessCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.financePublicationShare.push(row);
        const version = store.financePublicationVersion.find(
          (v) => v.id === row.publicationVersionId,
        );
        if (select && typeof select === "object") {
          return {
            id: row.id,
            expiresAt: row.expiresAt,
            publicationVersion: { versionNumber: version?.versionNumber ?? 1 },
          };
        }
        return row;
      },
      findMany: async ({
        where,
        orderBy,
        select,
      }: {
        where: {
          tenantId?: string;
          publicationVersionId?: string;
        };
        orderBy?: { createdAt: "desc" };
        select?: unknown;
      }) => {
        let rows = store.financePublicationShare.filter(
          (s) =>
            (!where.tenantId || s.tenantId === where.tenantId) &&
            (!where.publicationVersionId ||
              s.publicationVersionId === where.publicationVersionId),
        );
        if (orderBy?.createdAt === "desc") {
          rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return rows.map((row) => {
          const version = store.financePublicationVersion.find(
            (v) => v.id === row.publicationVersionId,
          );
          if (select) {
            return {
              id: row.id,
              createdAt: row.createdAt,
              expiresAt: row.expiresAt,
              revokedAt: row.revokedAt,
              createdBy: null,
              publicationVersion: { versionNumber: version?.versionNumber ?? 1 },
            };
          }
          return row;
        });
      },
      findFirst: async ({
        where,
        include,
      }: {
        where: { id?: string; tenantId?: string };
        include?: { publicationVersion?: { select: Record<string, boolean> } };
      }) => {
        const row =
          store.financePublicationShare.find(
            (s) =>
              (!where.id || s.id === where.id) &&
              (!where.tenantId || s.tenantId === where.tenantId),
          ) ?? null;
        if (!row) return null;
        const version = store.financePublicationVersion.find(
          (v) => v.id === row.publicationVersionId,
        );
        if (include?.publicationVersion && version) {
          return {
            ...row,
            publicationVersion: {
              id: version.id,
              tenantId: version.tenantId,
              publicationId: version.publicationId,
              versionNumber: version.versionNumber,
              lifecycleStatus: version.lifecycleStatus,
              publishedAt: version.publishedAt,
              snapshotPayloadJson: version.snapshotPayloadJson,
            },
          };
        }
        return row;
      },
      findUnique: async ({
        where,
        include,
      }: {
        where: { tokenHash: string };
        include?: { publicationVersion?: { select: Record<string, boolean> } };
      }) => {
        const row =
          store.financePublicationShare.find((s) => s.tokenHash === where.tokenHash) ?? null;
        if (!row) return null;
        const version = store.financePublicationVersion.find(
          (v) => v.id === row.publicationVersionId,
        );
        if (include?.publicationVersion && version) {
          return {
            ...row,
            publicationVersion: {
              id: version.id,
              tenantId: version.tenantId,
              publicationId: version.publicationId,
              versionNumber: version.versionNumber,
              lifecycleStatus: version.lifecycleStatus,
              publishedAt: version.publishedAt,
              snapshotPayloadJson: version.snapshotPayloadJson,
            },
          };
        }
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<ShareRow>;
      }) => {
        const row = store.financePublicationShare.find((s) => s.id === where.id);
        if (!row) throw new Error("share not found");
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id?: string; tenantId?: string; revokedAt?: null };
        data: Partial<ShareRow>;
      }) => {
        let count = 0;
        for (const row of store.financePublicationShare) {
          if (where.id && row.id !== where.id) continue;
          if (where.tenantId && row.tenantId !== where.tenantId) continue;
          if (where.revokedAt === null && row.revokedAt !== null) continue;
          Object.assign(row, data, { updatedAt: new Date() });
          count += 1;
        }
        return { count };
      },
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        store.auditLog.push(data);
        return data;
      },
    },
    user: {
      findFirst: async () => null,
    },
    $transaction: async <T>(fn: (tx: typeof db) => Promise<T>) => fn(db),
  };

  return db as unknown as import("@prisma/client").PrismaClient;
}
