import { describe, expect, it, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import { searchZielgruppeOrgUnitsAction } from "@/app/(admin)/dashboard/communication/zielgruppen/actions";

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: vi.fn(async () => {
    redirect("/login");
  }),
}));

vi.mock("@/lib/requirements/audience-selector-search", () => ({
  searchRequirementAudienceOrgUnits: vi.fn(),
}));

describe("Zielgruppen server actions — NEXT_REDIRECT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("re-throws redirect control flow instead of returning NEXT_REDIRECT as message", async () => {
    await expect(searchZielgruppeOrgUnitsAction("verein")).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
    });
  });
});
