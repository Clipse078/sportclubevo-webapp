import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getDefaultFinancePublicationShareStatusAction } from "@/app/(admin)/dashboard/finance/reports/publication-share-actions";
import { FINANCE_PUBLICATION_ACTION_PERSISTENCE_UNAVAILABLE } from "@/lib/finance/publishing/finance-publication-action-errors";

vi.mock("@/lib/finance/server/finance-page-context", () => ({
  loadFinanceWorkspaceContext: vi.fn(async () => ({
    ctx: { tenantId: "tenant-a", userId: "user-1", permissionKeys: new Set() },
  })),
}));

vi.mock("@/lib/finance/services/finance-publication-share-service", () => ({
  getActiveDefaultFinancePublicationShareLink: vi.fn(async () => {
    throw new Prisma.PrismaClientKnownRequestError(
      'The table `public.FinancePublicationShare` does not exist in the current database.',
      { code: "P2021", clientVersion: "test" },
    );
  }),
}));

describe("FIN-06D-R2 runtime incident containment", () => {
  it("architecture guard: finance reports SSR page does not import share persistence", () => {
    const reportsPage = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/finance/reports/page.tsx"),
      "utf8",
    );
    expect(reportsPage).not.toContain("finance-publication-share-service");
    expect(reportsPage).not.toContain("publication-share-actions");
  });

  it("returns bounded LOAD_FAILED when share schema is missing (does not throw)", async () => {
    const result = await getDefaultFinancePublicationShareStatusAction({
      publicationId: "pub-1",
      versionNumber: 1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("LOAD_FAILED");
    expect(result.error).toBe(FINANCE_PUBLICATION_ACTION_PERSISTENCE_UNAVAILABLE);
  });
});
