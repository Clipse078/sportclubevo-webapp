/**
 * AUFGABEN-06G1 — requirements permission reconciliation unit tests.
 */

import { describe, expect, it, vi } from "vitest";
import {
  REQUIREMENT_PERMISSION_KEYS,
  reconcileRequirementPermissions,
} from "../requirement-permission-reconciliation";

describe("requirement permission reconciliation", () => {
  it("defines four dedicated requirement capabilities", () => {
    expect(REQUIREMENT_PERMISSION_KEYS).toEqual([
      "requirements.view",
      "requirements.create",
      "requirements.manage",
      "requirements.view_aggregate",
    ]);
  });

  it("dry-run reports created permissions without writes", async () => {
    const permissionFindUnique = vi.fn().mockResolvedValue(null);
    const roleFindFirst = vi.fn().mockResolvedValue(null);
    const roleFindMany = vi.fn().mockResolvedValue([]);

    const prisma = {
      permission: {
        findUnique: permissionFindUnique,
        create: vi.fn(),
      },
      role: {
        findFirst: roleFindFirst,
        findMany: roleFindMany,
      },
      rolePermission: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    const result = await reconcileRequirementPermissions(prisma as never, true);
    expect(result.permissions.every((p) => p.action === "created")).toBe(true);
    expect(prisma.permission.create).not.toHaveBeenCalled();
  });
});
