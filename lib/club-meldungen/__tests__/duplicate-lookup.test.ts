import { describe, expect, it, vi, beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { searchClubMeldungenForDuplicateLink } from "@/lib/club-meldungen/duplicate-lookup";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    clubMeldung: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";

describe("searchClubMeldungenForDuplicateLink", () => {
  beforeEach(() => {
    vi.mocked(prisma.clubMeldung.findMany).mockReset();
  });

  it("returns only cases visible to the handler and excludes self", async () => {
    vi.mocked(prisma.clubMeldung.findMany).mockResolvedValue([
      {
        id: "owned",
        caseNumber: "M-1",
        subject: "Same",
        reporterUserId: "rep-1",
        accountableUserId: "handler-a",
        collaborators: [],
      },
      {
        id: "foreign",
        caseNumber: "M-2",
        subject: "Other",
        reporterUserId: "rep-2",
        accountableUserId: "handler-b",
        collaborators: [],
      },
    ] as never);

    const items = await searchClubMeldungenForDuplicateLink({
      tenantId: "tenant-1",
      query: "M-",
      excludeMeldungId: "self",
      access: {
        actorUserId: "handler-a",
        permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE],
      },
    });

    expect(items).toEqual([
      { id: "owned", caseNumber: "M-1", subject: "Same" },
    ]);
    expect(prisma.clubMeldung.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "self" },
          tenantId: "tenant-1",
        }),
      }),
    );
  });
});