import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { saveQuickAccessPreference } from "../preference-service";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    userDashboardQuickAccessPreference: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";

describe("DASHBOARD-04 — persistence security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const catalogContext = {
    permissionKeys: [PERMISSIONS.TASKS_VIEW],
    navCapabilities: { personalActionsModule: false },
  };

  it("rejects unknown keys on write", async () => {
    const result = await saveQuickAccessPreference("tenant-a", "user-a", ["navigation.unknown"], catalogContext);
    expect(result.ok).toBe(false);
    expect(prisma.userDashboardQuickAccessPreference.upsert).not.toHaveBeenCalled();
  });

  it("persists validated tenant-scoped preference for authorized keys", async () => {
    const result = await saveQuickAccessPreference(
      "tenant-a",
      "user-a",
      ["navigation.aufgaben"],
      catalogContext,
    );
    expect(result.ok).toBe(true);
    expect(prisma.userDashboardQuickAccessPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_userId: { tenantId: "tenant-a", userId: "user-a" } },
        create: expect.objectContaining({ pinnedKeys: ["navigation.aufgaben"] }),
      }),
    );
  });
});
