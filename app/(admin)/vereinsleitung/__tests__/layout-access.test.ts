import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/permissions/require-vereinsleitung-workspace-access", () => ({
  requireVereinsleitungWorkspaceAccess: vi.fn(),
}));

import { requireVereinsleitungWorkspaceAccess } from "@/lib/permissions/require-vereinsleitung-workspace-access";
import VereinsleitungWorkspaceLayout from "../layout";

describe("Vereinsleitung workspace layout (SCE-CD-01R1)", () => {
  it("enforces workspace access before rendering children", async () => {
    const child = "child";
    const result = await VereinsleitungWorkspaceLayout({
      children: child,
    });
    expect(requireVereinsleitungWorkspaceAccess).toHaveBeenCalled();
    expect(result).toBe(child);
  });
});
