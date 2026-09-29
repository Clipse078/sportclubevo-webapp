import { beforeEach, describe, expect, it, vi } from "vitest";
import { ELIGIBLE_TASK_ASSIGNEE_SEARCH_LIMIT } from "../quick-create-assignee-search";
import { searchEligibleTaskAssignees } from "../queries";

const mocks = vi.hoisted(() => ({
  searchEligiblePersonUserIdentitiesInTenant: vi.fn(),
  listEligiblePersonUserIdentitiesInTenant: vi.fn(),
}));

vi.mock("@/lib/people/person-user-identity", () => ({
  searchEligiblePersonUserIdentitiesInTenant: mocks.searchEligiblePersonUserIdentitiesInTenant,
  listEligiblePersonUserIdentitiesInTenant: mocks.listEligiblePersonUserIdentitiesInTenant,
  resolvePersonUserIdentityByUserId: vi.fn(),
}));

describe("searchEligibleTaskAssignees", () => {
  beforeEach(() => {
    mocks.searchEligiblePersonUserIdentitiesInTenant.mockReset();
    mocks.listEligiblePersonUserIdentitiesInTenant.mockReset();
    mocks.searchEligiblePersonUserIdentitiesInTenant.mockResolvedValue([]);
    mocks.listEligiblePersonUserIdentitiesInTenant.mockResolvedValue([]);
  });

  it("returns empty for short search terms without querying", async () => {
    const rows = await searchEligibleTaskAssignees("tenant-1", "a");
    expect(rows).toEqual([]);
    expect(mocks.searchEligiblePersonUserIdentitiesInTenant).not.toHaveBeenCalled();
  });

  it("delegates search to canonical person-user identity resolver", async () => {
    await searchEligibleTaskAssignees("tenant-1", "san", 10);
    expect(mocks.searchEligiblePersonUserIdentitiesInTenant).toHaveBeenCalledWith(
      "tenant-1",
      "san",
      10,
    );
  });

  it("uses default bounded limit", async () => {
    await searchEligibleTaskAssignees("tenant-1", "michael");
    expect(mocks.searchEligiblePersonUserIdentitiesInTenant).toHaveBeenCalledWith(
      "tenant-1",
      "michael",
      ELIGIBLE_TASK_ASSIGNEE_SEARCH_LIMIT,
    );
  });
});
