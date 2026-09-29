/**
 * SCE-SELECTOR-02R4 — TASK_ASSIGNMENT runtime recovery (FCA / Michael scenario).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { discoverSceSelectorItems } from "@/lib/sce/list-selector/discover-selector-items";
import { browsePersonSelectorItems } from "@/lib/sce/list-selector/sources/person-selector-source";

const identityMocks = vi.hoisted(() => ({
  listEligiblePersonUserIdentitiesInTenant: vi.fn(),
  resolvePersonUserIdentityByPersonId: vi.fn(),
}));

const discoveryMocks = vi.hoisted(() => ({
  browseDiscoverableTenantPersons: vi.fn(),
  searchDiscoverableTenantPersons: vi.fn(),
}));

vi.mock("@/lib/people/person-user-identity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/people/person-user-identity")>();
  return {
    ...actual,
    listEligiblePersonUserIdentitiesInTenant:
      identityMocks.listEligiblePersonUserIdentitiesInTenant,
    resolvePersonUserIdentityByPersonId: identityMocks.resolvePersonUserIdentityByPersonId,
  };
});

vi.mock("@/lib/tasks/eligible-task-assignee-persons", () => ({
  listEligibleTaskAssigneePersons: (...args: unknown[]) =>
    identityMocks.listEligiblePersonUserIdentitiesInTenant(...args).then((rows) =>
      rows.map(
        (row: {
          personId: string;
          userId: string;
          firstName: string;
          lastName: string;
          email: string;
          displayName: string;
        }) => ({
          personId: row.personId,
          userId: row.userId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          displayName: row.displayName,
        }),
      ),
    ),
  searchEligibleTaskAssigneePersons: vi.fn(),
}));

vi.mock("@/lib/people/tenant-person-discovery", () => ({
  browseDiscoverableTenantPersons: discoveryMocks.browseDiscoverableTenantPersons,
  searchDiscoverableTenantPersons: discoveryMocks.searchDiscoverableTenantPersons,
}));

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-SELECTOR-02R4", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TASK_ASSIGNMENT discover returns Michael for actor with empty query and no excludeUserIds", async () => {
    identityMocks.listEligiblePersonUserIdentitiesInTenant.mockResolvedValue([
      {
        personId: "person-michael",
        userId: "user-michael",
        tenantId: "tenant-fca",
        firstName: "Michael",
        lastName: "Duijster",
        displayName: "Michael Duijster",
        email: "it@fcallschwil.ch",
      },
      {
        personId: "person-other",
        userId: "user-other",
        tenantId: "tenant-fca",
        firstName: "Cirino",
        lastName: "Peer",
        displayName: "Cirino Peer",
        email: "c@example.com",
      },
    ]);

    const groups = await discoverSceSelectorItems({
      tenantId: "tenant-fca",
      actorUserId: "user-michael",
      enabledTypes: ["PERSON"],
      category: "all",
      query: "",
      authorizationContext: "TASK_ASSIGNMENT",
      excludeUserIds: [],
    });

    expect(groups).toHaveLength(1);
    const person = groups[0]?.items.find((i) => i.id === "person-michael");
    expect(person?.label).toBe("Michael Duijster");
    expect(person?.metadata?.linkedUserId).toBe("user-michael");
  });

  it("TASK_ASSIGNMENT browse still returns actor when they are the only eligible assignee (no implicit actor exclusion)", async () => {
    identityMocks.listEligiblePersonUserIdentitiesInTenant.mockResolvedValue([
      {
        personId: "person-michael",
        userId: "user-michael",
        tenantId: "tenant-fca",
        firstName: "Michael",
        lastName: "Duijster",
        displayName: "Michael Duijster",
        email: "it@fcallschwil.ch",
      },
    ]);

    const page = await browsePersonSelectorItems({
      tenantId: "tenant-fca",
      actorUserId: "user-michael",
      authorizationContext: "TASK_ASSIGNMENT",
      excludeUserIds: [],
      limit: 20,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.metadata?.linkedUserId).toBe("user-michael");
  });

  it("REQUIREMENT_AUDIENCE uses tenant discovery while TASK uses eligibility (request path divergence)", async () => {
    discoveryMocks.browseDiscoverableTenantPersons.mockResolvedValue([
      {
        personId: "person-michael",
        firstName: "Michael",
        lastName: "Duijster",
        displayName: "Michael Duijster",
        email: "it@fcallschwil.ch",
      },
      {
        personId: "person-no-user",
        firstName: "Guest",
        lastName: "Only",
        displayName: "Guest Only",
        email: null,
      },
    ]);
    identityMocks.listEligiblePersonUserIdentitiesInTenant.mockResolvedValue([
      {
        personId: "person-michael",
        userId: "user-michael",
        tenantId: "tenant-fca",
        firstName: "Michael",
        lastName: "Duijster",
        displayName: "Michael Duijster",
        email: "it@fcallschwil.ch",
      },
    ]);

    const requirementPage = await browsePersonSelectorItems({
      tenantId: "tenant-fca",
      actorUserId: "user-michael",
      authorizationContext: "REQUIREMENT_AUDIENCE",
      limit: 20,
    });
    const taskPage = await browsePersonSelectorItems({
      tenantId: "tenant-fca",
      actorUserId: "user-michael",
      authorizationContext: "TASK_ASSIGNMENT",
      limit: 20,
    });

    expect(requirementPage.items).toHaveLength(2);
    expect(taskPage.items).toHaveLength(1);
    expect(taskPage.items[0]?.metadata?.linkedUserId).toBe("user-michael");
  });

  it("SceChipMultiSelectorField does not map selected assignee userIds to excludeUserIds", () => {
    const chipField = read("components/sce/list-selector/SceChipMultiSelectorField.tsx");
    expect(chipField).not.toContain("[...selectedIds, ...(excludeUserIds ?? [])]");
    expect(chipField).toContain("excludeUserIds: excludeUserIds ?? []");
  });

  it("explicit excludeUserIds removes only the targeted user, not Person ids", async () => {
    identityMocks.listEligiblePersonUserIdentitiesInTenant.mockResolvedValue([
      {
        personId: "person-michael",
        userId: "user-michael",
        tenantId: "tenant-fca",
        firstName: "Michael",
        lastName: "Duijster",
        displayName: "Michael Duijster",
        email: "it@fcallschwil.ch",
      },
      {
        personId: "person-other",
        userId: "user-other",
        tenantId: "tenant-fca",
        firstName: "Test",
        lastName: "User",
        displayName: "Test User",
        email: "test@example.com",
      },
    ]);

    const page = await browsePersonSelectorItems({
      tenantId: "tenant-fca",
      actorUserId: "user-michael",
      authorizationContext: "TASK_ASSIGNMENT",
      excludeUserIds: ["user-other"],
      limit: 20,
    });

    expect(page.items.map((i) => i.id)).toEqual(["person-michael"]);
  });
});
