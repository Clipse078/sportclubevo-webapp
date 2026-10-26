import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  loadFinancePublicationVersionHistoryPage,
  loadFinancePublicationSummaryForYear,
} from "@/lib/finance/services/finance-publication-query-service";
import { FINANCE_PUBLICATION_HISTORY_PAGE_SIZE } from "@/lib/finance/publishing/finance-publication-history-contract";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

function ctx(tenantId: string): FinanceAuthContext {
  return {
    tenantId,
    userId: "user-1",
    permissionKeys: new Set([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_PUBLICATION_VIEW,
    ]),
  };
}

type VersionRow = {
  versionNumber: number;
  lifecycleStatus: string;
  publishedAt: Date | null;
  tenantId: string;
  publicationId: string;
};

function makePrisma(input: {
  publicationId: string;
  publicationTenantId: string;
  versions: VersionRow[];
}) {
  return {
    financePublication: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; tenantId: string };
      }) => {
        if (where.id !== input.publicationId || where.tenantId !== input.publicationTenantId) {
          return null;
        }
        return { id: input.publicationId };
      },
      findMany: async ({
        where,
        include,
      }: {
        where: { tenantId: string; financeYearId: string };
        include: {
          versions: { orderBy: { versionNumber: "desc" }; take: number; select: unknown };
          _count: { select: { versions: true } };
        };
      }) => {
        if (where.tenantId !== input.publicationTenantId) return [];
        const versions = input.versions
          .filter((v) => v.publicationId === input.publicationId)
          .sort((a, b) => b.versionNumber - a.versionNumber);
        return [
          {
            id: input.publicationId,
            financeYearId: where.financeYearId,
            title: "Publication",
            versions: versions.slice(0, include.versions.take),
            _count: { versions: versions.length },
          },
        ];
      },
    },
    financePublicationVersion: {
      findMany: async ({
        where,
        orderBy,
        take,
      }: {
        where: {
          publicationId: string;
          tenantId: string;
          versionNumber?: { lt: number };
        };
        orderBy: { versionNumber: "desc" };
        take: number;
      }) => {
        let rows = input.versions.filter(
          (v) =>
            v.publicationId === where.publicationId &&
            v.tenantId === where.tenantId &&
            (where.versionNumber?.lt != null ? v.versionNumber < where.versionNumber.lt : true),
        );
        rows = rows.sort((a, b) =>
          orderBy.versionNumber === "desc"
            ? b.versionNumber - a.versionNumber
            : a.versionNumber - b.versionNumber,
        );
        return rows.slice(0, take);
      },
    },
  };
}

describe("finance publication version history page", () => {
  const publicationId = "pub-1";
  const versions: VersionRow[] = Array.from({ length: 15 }, (_, i) => ({
    publicationId,
    tenantId: tenantA,
    versionNumber: 15 - i,
    lifecycleStatus: i === 0 ? "PUBLISHED" : "SUPERSEDED",
    publishedAt: new Date("2026-10-26T10:00:00.000Z"),
  }));

  it("returns newest-first bounded pages with cursor", async () => {
    const prisma = makePrisma({
      publicationId,
      publicationTenantId: tenantA,
      versions,
    });

    const first = await loadFinancePublicationVersionHistoryPage(
      prisma as never,
      ctx(tenantA),
      { publicationId },
    );
    expect(first.versions).toHaveLength(FINANCE_PUBLICATION_HISTORY_PAGE_SIZE);
    expect(first.versions[0]?.versionNumber).toBe(15);
    expect(first.hasOlder).toBe(true);
    expect(first.nextCursorVersionNumber).toBe(6);

    const second = await loadFinancePublicationVersionHistoryPage(
      prisma as never,
      ctx(tenantA),
      { publicationId, cursorVersionNumber: first.nextCursorVersionNumber },
    );
    expect(second.versions).toHaveLength(5);
    expect(second.hasOlder).toBe(false);
  });

  it("scopes history reads to tenant", async () => {
    const prisma = makePrisma({
      publicationId,
      publicationTenantId: tenantA,
      versions,
    });

    const page = await loadFinancePublicationVersionHistoryPage(
      prisma as never,
      ctx(tenantB),
      { publicationId },
    );
    expect(page.versions).toHaveLength(0);
  });

  it("summary exposes versionCount without eager version list", async () => {
    const prisma = makePrisma({
      publicationId,
      publicationTenantId: tenantA,
      versions,
    });

    const summary = await loadFinancePublicationSummaryForYear(
      prisma as never,
      ctx(tenantA),
      "fy-2026",
    );
    expect(summary.publications[0]?.versionCount).toBe(15);
    expect(summary.publications[0]?.versions).toEqual([]);
  });
});
