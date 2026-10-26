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
  publicToken: string | null;
  tokenHash: string | null;
  shareKind: "DEFAULT" | "ADVANCED";
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

function rowMatchesWhere(row: ShareRow, where: Record<string, unknown>): boolean {
  if (where.id && row.id !== where.id) return false;
  if (where.tenantId && row.tenantId !== where.tenantId) return false;
  if (where.publicationVersionId && row.publicationVersionId !== where.publicationVersionId) {
    return false;
  }
  if (where.shareKind && row.shareKind !== where.shareKind) return false;
  if (where.revokedAt === null && row.revokedAt !== null) return false;
  if (where.expiresAt === null && row.expiresAt !== null) return false;
  return true;
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
        data: Partial<ShareRow>;
        select?: unknown;
      }) => {
        if (
          data.shareKind === "DEFAULT" &&
          !data.expiresAt &&
          store.financePublicationShare.some((row) =>
            rowMatchesWhere(row, {
              tenantId: data.tenantId,
              publicationVersionId: data.publicationVersionId,
              shareKind: "DEFAULT",
              revokedAt: null,
              expiresAt: null,
            }),
          )
        ) {
          const err = new Error("Unique constraint") as Error & { code: string };
          err.code = "P2002";
          throw err;
        }
        const row: ShareRow = {
          id: randomUUID(),
          tenantId: data.tenantId!,
          publicationId: data.publicationId!,
          publicationVersionId: data.publicationVersionId!,
          publicToken: data.publicToken ?? null,
          tokenHash: data.tokenHash ?? null,
          shareKind: data.shareKind ?? "DEFAULT",
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
      findFirst: async ({
        where,
        select,
        include,
      }: {
        where: Record<string, unknown>;
        select?: unknown;
        include?: { publicationVersion?: { select: Record<string, boolean> } };
      }) => {
        const row = store.financePublicationShare.find((s) => rowMatchesWhere(s, where)) ?? null;
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
        if (select) {
          return {
            id: row.id,
            publicToken: row.publicToken,
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
              shareKind: row.shareKind,
              publicToken: row.publicToken,
              createdBy: null,
              publicationVersion: { versionNumber: version?.versionNumber ?? 1 },
            };
          }
          return row;
        });
      },
      findUnique: async ({
        where,
        include,
      }: {
        where: { tokenHash?: string; publicToken?: string };
        include?: { publicationVersion?: { select: Record<string, boolean> } };
      }) => {
        const row =
          store.financePublicationShare.find(
            (s) =>
              (where.tokenHash !== undefined && s.tokenHash === where.tokenHash) ||
              (where.publicToken !== undefined && s.publicToken === where.publicToken),
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
          if (!rowMatchesWhere(row, where as Record<string, unknown>)) continue;
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
