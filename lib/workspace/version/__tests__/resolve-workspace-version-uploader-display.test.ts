import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  personFindMany: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
  userFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    person: { findMany: mocks.personFindMany },
    tenantMembership: { findMany: mocks.tenantMembershipFindMany },
    user: { findMany: mocks.userFindMany },
  },
}));

import {
  formatWorkspacePersonDisplayName,
  resolveWorkspaceVersionUploaderDisplayNames,
} from "@/lib/workspace/version/resolve-workspace-version-uploader-display";
import {
  WORKSPACE_VERSION_UPLOADER_UNAVAILABLE,
  toWorkspaceVersionUploaderPublicDto,
} from "@/lib/workspace/version/version-uploader-public-dto";

describe("resolveWorkspaceVersionUploaderDisplayNames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantMembershipFindMany.mockResolvedValue([]);
    mocks.userFindMany.mockResolvedValue([]);
  });

  it("prefers same-tenant Person displayName", async () => {
    mocks.personFindMany.mockResolvedValue([
      {
        userId: "user-a",
        displayName: "Michael Duijster",
        firstName: "Michael",
        lastName: "Duijster",
      },
    ]);

    const map = await resolveWorkspaceVersionUploaderDisplayNames("tenant-1", [
      "user-a",
    ]);

    expect(map.get("user-a")).toBe("Michael Duijster");
    expect(mocks.personFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-1" }),
      }),
    );
    expect(mocks.userFindMany).not.toHaveBeenCalled();
  });

  it("falls back to tenant membership User name when Person link is missing", async () => {
    mocks.personFindMany.mockResolvedValue([]);
    mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: "user-b" }]);
    mocks.userFindMany.mockResolvedValue([
      { id: "user-b", firstName: "Sandra", lastName: "Muster" },
    ]);

    const map = await resolveWorkspaceVersionUploaderDisplayNames("tenant-1", [
      "user-b",
    ]);

    expect(map.get("user-b")).toBe("Sandra Muster");
  });

  it("does not resolve users outside tenant membership", async () => {
    mocks.personFindMany.mockResolvedValue([]);
    mocks.tenantMembershipFindMany.mockResolvedValue([]);

    const map = await resolveWorkspaceVersionUploaderDisplayNames("tenant-1", [
      "foreign-user",
    ]);

    expect(map.size).toBe(0);
    expect(mocks.userFindMany).not.toHaveBeenCalled();
  });

  it("public DTO uses neutral fallback for missing actor", () => {
    expect(
      toWorkspaceVersionUploaderPublicDto(null, new Map()),
    ).toEqual({
      displayName: WORKSPACE_VERSION_UPLOADER_UNAVAILABLE,
    });
  });

  it("formatWorkspacePersonDisplayName uses first/last when displayName empty", () => {
    expect(
      formatWorkspacePersonDisplayName({
        displayName: null,
        firstName: "Michael",
        lastName: "Duijster",
      }),
    ).toBe("Michael Duijster");
  });
});
