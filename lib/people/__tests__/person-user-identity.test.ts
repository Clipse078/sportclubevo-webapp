import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listEligiblePersonUserIdentitiesInTenant,
  resolvePersonUserIdentityByUserId,
  searchEligiblePersonUserIdentitiesInTenant,
} from "@/lib/people/person-user-identity";

const mocks = vi.hoisted(() => ({
  tenantMembershipFindMany: vi.fn(),
  tenantMembershipFindUnique: vi.fn(),
  personFindFirst: vi.fn(),
  personFindUnique: vi.fn(),
  personFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: {
      findMany: mocks.tenantMembershipFindMany,
      findUnique: mocks.tenantMembershipFindUnique,
    },
    person: {
      findFirst: mocks.personFindFirst,
      findUnique: mocks.personFindUnique,
      findMany: mocks.personFindMany,
    },
  },
}));

describe("person-user-identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists eligible linked Person identities via active tenant membership", async () => {
    mocks.tenantMembershipFindMany.mockResolvedValue([
      {
        user: {
          person: {
            id: "person-1",
            tenantId: "tenant-a",
            userId: "user-1",
            firstName: "Michael",
            lastName: "Duijster",
            displayName: null,
            email: "m@example.com",
            isActive: true,
            user: {
              id: "user-1",
              email: "m@example.com",
              firstName: "Michael",
              lastName: "Duijster",
              isActive: true,
            },
          },
        },
      },
    ]);

    const rows = await listEligiblePersonUserIdentitiesInTenant("tenant-a");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      personId: "person-1",
      userId: "user-1",
      displayName: "Michael Duijster",
    });
  });

  it("excludes Person without active tenant membership", async () => {
    mocks.tenantMembershipFindUnique.mockResolvedValue(null);
    const row = await resolvePersonUserIdentityByUserId("tenant-a", "user-1");
    expect(row).toBeNull();
  });

  it("excludes inactive Person even when membership exists", async () => {
    mocks.tenantMembershipFindUnique.mockResolvedValue({ isActive: true });
    mocks.personFindUnique.mockResolvedValue({
      id: "person-1",
      tenantId: "tenant-a",
      userId: "user-1",
      firstName: "X",
      lastName: "Y",
      displayName: null,
      email: null,
      isActive: false,
      user: { id: "user-1", email: "x@y.com", firstName: "X", lastName: "Y", isActive: true },
    });
    const row = await resolvePersonUserIdentityByUserId("tenant-a", "user-1");
    expect(row).toBeNull();
  });

  it("search returns eligible person for empty-term browse path via membership list", async () => {
    mocks.personFindMany.mockResolvedValue([
      {
        id: "person-2",
        tenantId: "tenant-a",
        userId: "user-2",
        firstName: "Cirino",
        lastName: "Test",
        displayName: null,
        email: null,
        isActive: true,
        user: {
          id: "user-2",
          email: "c@example.com",
          firstName: "Cirino",
          lastName: "Test",
          isActive: true,
        },
      },
    ]);

    const rows = await searchEligiblePersonUserIdentitiesInTenant("tenant-a", "cir", 10);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.personId).toBe("person-2");
  });
});
