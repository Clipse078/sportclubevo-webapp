/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/visibility/get-actor-context", () => ({
  getActorContext: vi.fn(),
}));

vi.mock("@/lib/club-development/vorhaben-workspace", () => ({
  loadVorhabenWorkspace: vi.fn(),
}));

vi.mock("@/components/admin/club-development/VorhabenAufgabenWorkspace", () => ({
  default: () => <div data-testid="vorhaben-aufgaben-workspace" />,
}));

import VorhabenAufgabenPage from "../page";
import { auth } from "@/auth";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { loadVorhabenWorkspace } from "@/lib/club-development/vorhaben-workspace";
import { CD_NAV_COPY } from "@/lib/club-development/product-copy";

describe("/vereinsleitung/vorhaben page (PKG-02)", () => {
  it("renders CD-WORK workspace shell when data is available", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", activeTenantId: "t1" },
    } as never);
    vi.mocked(getActorContext).mockResolvedValue({
      tenantId: "t1",
      permissionKeys: ["initiatives.view", "tasks.view"],
    } as never);
    vi.mocked(loadVorhabenWorkspace).mockResolvedValue({
      initiatives: [],
      tasks: [],
      canViewInitiatives: true,
      canViewTasks: true,
      canManageInitiatives: false,
      canManageTasks: false,
      restrictedReason: null,
    });

    const ui = await VorhabenAufgabenPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByRole("heading", { name: CD_NAV_COPY.initiativesAndTasksHub })).toBeTruthy();
    expect(screen.getByTestId("vorhaben-aufgaben-workspace")).toBeTruthy();
  });
});