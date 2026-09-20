/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/permissions/require-permission", () => ({
  requirePermission: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: vi.fn().mockResolvedValue({
    tenantId: "tenant-1",
    userId: "user-1",
    permissionKeys: ["tasks.view", "tasks.create", "tasks.assign"],
  }),
}));

vi.mock("@/lib/tasks/task-service", () => ({
  listTasks: vi.fn().mockResolvedValue([
    {
      id: "task-1",
      tenantId: "tenant-1",
      title: "Material bestellen",
      description: null,
      status: "OPEN",
      priority: "NORMAL",
      dueAt: null,
      completedAt: null,
      contextType: null,
      contextId: null,
      createdByUserId: "user-1",
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
      assignees: [],
    },
  ]),
}));

vi.mock("@/lib/tasks/queries", () => ({
  listEligibleTaskAssignees: vi.fn().mockResolvedValue([
    {
      userId: "user-2",
      firstName: "Sam",
      lastName: "Staff",
      email: "sam@example.com",
    },
  ]),
}));

import AufgabenPage from "../page";

describe("AUFGABEN-01 — Aufgaben proof page", () => {
  it("renders persisted tasks instead of the future-module shell", async () => {
    const jsx = await AufgabenPage();
    render(jsx);
    expect(screen.getByRole("heading", { level: 1, name: "Aufgaben" })).toBeInTheDocument();
    expect(screen.getByText("Material bestellen")).toBeInTheDocument();
    expect(screen.queryByText("In Vorbereitung")).toBeNull();
  });
});
