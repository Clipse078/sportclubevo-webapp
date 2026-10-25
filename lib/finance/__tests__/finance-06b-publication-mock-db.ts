import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

type PublicationRow = {
  id: string;
  tenantId: string;
  financeYearId: string;
  title: string;
  lifecycleStatus: "DRAFT" | "READY" | "PUBLISHED" | "SUPERSEDED" | "REVOKED";
  reportingScopeJson: unknown;
  currentVersionId: string | null;
  createdByUserId: string | null;
  publishedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type VersionRow = {
  id: string;
  tenantId: string;
  publicationId: string;
  versionNumber: number;
  lifecycleStatus: PublicationRow["lifecycleStatus"];
  snapshotSchemaVersion: string;
  snapshotPayloadJson: unknown;
  currencyCode: string;
  audienceClass: string;
  sourceMetadataJson: unknown;
  publishedAt: Date | null;
  supersededAt: Date | null;
  revokedAt: Date | null;
  publishedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicationMockStore = {
  financeYear: Array<{ id: string; tenantId: string; name: string }>;
  financePublication: PublicationRow[];
  financePublicationVersion: VersionRow[];
  versionLocks: Map<string, Promise<void>>;
};

export function createPublicationMockStore(): PublicationMockStore {
  return {
    financeYear: [],
    financePublication: [],
    financePublicationVersion: [],
    versionLocks: new Map(),
  };
}

async function withPublicationLock(
  store: PublicationMockStore,
  publicationId: string,
  fn: () => Promise<void>,
): Promise<void> {
  const prior = store.versionLocks.get(publicationId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  store.versionLocks.set(
    publicationId,
    prior.then(() => gate),
  );
  await prior;
  try {
    await fn();
  } finally {
    release();
  }
}

export function makePublicationMockPrisma(store: PublicationMockStore) {
  let transactionChain: Promise<unknown> = Promise.resolve();

  const db = {
    financeYear: {
      findFirst: async ({
        where,
      }: {
        where: { id?: string; tenantId?: string };
      }) =>
        store.financeYear.find(
          (y) =>
            (!where.id || y.id === where.id) &&
            (!where.tenantId || y.tenantId === where.tenantId),
        ) ?? null,
    },
    financePublication: {
      findFirst: async ({
        where,
      }: {
        where: { id?: string; tenantId?: string; financeYearId?: string };
        select?: unknown;
      }) => {
        const row =
          store.financePublication.find(
            (p) =>
              (!where.id || p.id === where.id) &&
              (!where.tenantId || p.tenantId === where.tenantId) &&
              (!where.financeYearId || p.financeYearId === where.financeYearId),
          ) ?? null;
        if (!row) return null;
        return { id: row.id, tenantId: row.tenantId };
      },
      findMany: async ({
        where,
        include,
      }: {
        where: { tenantId?: string; financeYearId?: string; id?: string };
        include?: { versions?: { orderBy: { versionNumber: "desc" } } };
      }) => {
        let rows = store.financePublication.filter(
          (p) =>
            (!where.tenantId || p.tenantId === where.tenantId) &&
            (!where.financeYearId || p.financeYearId === where.financeYearId) &&
            (!where.id || p.id === where.id),
        );
        if (include?.versions) {
          return rows.map((p) => ({
            ...p,
            versions: store.financePublicationVersion
              .filter((v) => v.publicationId === p.id)
              .sort((a, b) => b.versionNumber - a.versionNumber),
          }));
        }
        return rows;
      },
      create: async ({ data, include }: { data: Partial<PublicationRow>; include?: unknown }) => {
        const row: PublicationRow = {
          id: randomUUID(),
          tenantId: data.tenantId!,
          financeYearId: data.financeYearId!,
          title: data.title!,
          lifecycleStatus: (data.lifecycleStatus as PublicationRow["lifecycleStatus"]) ?? "DRAFT",
          reportingScopeJson: data.reportingScopeJson,
          currentVersionId: null,
          createdByUserId: data.createdByUserId ?? null,
          publishedByUserId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.financePublication.push(row);
        const result = include
          ? { ...row, versions: [] as VersionRow[] }
          : row;
        return result;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<PublicationRow>;
      }) => {
        const row = store.financePublication.find((p) => p.id === where.id);
        if (!row) throw new Error("publication not found");
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    financePublicationVersion: {
      findFirst: async ({
        where,
      }: {
        where: {
          publicationId?: string;
          tenantId?: string;
          versionNumber?: number;
        };
      }) =>
        store.financePublicationVersion.find(
          (v) =>
            (!where.publicationId || v.publicationId === where.publicationId) &&
            (!where.tenantId || v.tenantId === where.tenantId) &&
            (where.versionNumber === undefined || v.versionNumber === where.versionNumber),
        ) ?? null,
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financePublicationVersion.find((v) => v.id === where.id) ?? null,
      create: async ({ data }: { data: Partial<VersionRow> }) => {
        const publicationId = data.publicationId!;
        let created!: VersionRow;
        await withPublicationLock(store, publicationId, async () => {
          const siblings = store.financePublicationVersion.filter(
            (v) => v.publicationId === publicationId,
          );
          if (siblings.some((v) => v.versionNumber === data.versionNumber)) {
            throw new Error("Unique constraint failed on versionNumber");
          }
          created = {
            id: randomUUID(),
            tenantId: data.tenantId!,
            publicationId,
            versionNumber: data.versionNumber!,
            lifecycleStatus: data.lifecycleStatus as VersionRow["lifecycleStatus"],
            snapshotSchemaVersion: data.snapshotSchemaVersion!,
            snapshotPayloadJson: data.snapshotPayloadJson,
            currencyCode: data.currencyCode!,
            audienceClass: data.audienceClass!,
            sourceMetadataJson: data.sourceMetadataJson,
            publishedAt: data.publishedAt ?? null,
            supersededAt: null,
            revokedAt: null,
            publishedByUserId: data.publishedByUserId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          store.financePublicationVersion.push(created);
        });
        return created!;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<VersionRow>;
      }) => {
        const row = store.financePublicationVersion.find((v) => v.id === where.id);
        if (!row) throw new Error("version not found");
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    $transaction: async <T>(fn: (tx: typeof db) => Promise<T>) => {
      const run = transactionChain.then(() => fn(db));
      transactionChain = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };

  return db as unknown as import("@prisma/client").PrismaClient;
}
