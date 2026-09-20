/**
 * AUFGABEN-04 — operational task context registry, validation, and batch resolution.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { validateTaskContext } from "../context-validation";
import { canAttachTaskContext } from "../context-access";
import { resolveTaskContextsBatch } from "../context-resolution";
import { TaskValidationError } from "../errors";
import type { TaskServiceContext } from "../types";

const prismaMocks = vi.hoisted(() => ({
  eventFindMany: vi.fn(),
  teamFindFirst: vi.fn(),
  tenantFindUnique: vi.fn(),
  loadOrgUnitIds: vi.fn(),
  loadTargetGroupIds: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findMany: prismaMocks.eventFindMany, findFirst: vi.fn() },
    trainingSeries: { findFirst: vi.fn(), findMany: vi.fn() },
    meeting: { findFirst: vi.fn(), findMany: vi.fn() },
    registration: { findFirst: vi.fn(), findMany: vi.fn() },
    team: { findFirst: prismaMocks.teamFindFirst, findMany: vi.fn() },
    person: { findFirst: vi.fn(), findMany: vi.fn() },
    workspaceDocument: { findFirst: vi.fn(), findMany: vi.fn() },
    tenant: { findUnique: prismaMocks.tenantFindUnique },
  },
}));

vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: prismaMocks.loadOrgUnitIds,
  loadTargetGroupIds: prismaMocks.loadTargetGroupIds,
}));

const TENANT = "tenant-a";

function ctx(perms: string[]): TaskServiceContext {
  return { tenantId: TENANT, userId: "user-1", permissionKeys: perms };
}

describe("AUFGABEN-04 context access", () => {
  it("requires operational read permission to attach MATCH context", () => {
    expect(canAttachTaskContext(ctx([PERMISSIONS.TASKS_CREATE]), "MATCH")).toBe(false);
    expect(
      canAttachTaskContext(
        ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.EVENTS_VIEW]),
        "MATCH",
      ),
    ).toBe(true);
  });
});

describe("AUFGABEN-04 validateTaskContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A — accepts valid same-tenant team context", async () => {
    prismaMocks.teamFindFirst.mockResolvedValue({ id: "team-1" });
    await expect(
      validateTaskContext(
        ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.TEAMS_VIEW]),
        "TEAM",
        "team-1",
      ),
    ).resolves.toBeUndefined();
  });

  it("B — rejects when operational permission missing", async () => {
    await expect(
      validateTaskContext(ctx([PERMISSIONS.TASKS_CREATE]), "TEAM", "team-1"),
    ).rejects.toThrow(TaskValidationError);
  });

  it("C — rejects missing entity", async () => {
    prismaMocks.teamFindFirst.mockResolvedValue(null);
    await expect(
      validateTaskContext(
        ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.TEAMS_VIEW]),
        "TEAM",
        "missing",
      ),
    ).rejects.toThrow(TaskValidationError);
  });
});

describe("AUFGABEN-04 batch resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.loadOrgUnitIds.mockResolvedValue([]);
    prismaMocks.loadTargetGroupIds.mockResolvedValue([]);
  });

  it("G — resolves match label and href when authorized", async () => {
    prismaMocks.eventFindMany.mockResolvedValue([
      {
        id: "match-1",
        type: "MATCH",
        title: "FC Allschwil – FC Basel",
        startAt: new Date("2026-09-27T08:00:00.000Z"),
        allDay: false,
      },
    ]);

    const map = await resolveTaskContextsBatch(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW]),
      [{ contextType: "MATCH", contextId: "match-1" }],
      "de-CH",
      "Europe/Zurich",
    );

    const row = map.get("MATCH:match-1");
    expect(row?.title).toBe("FC Allschwil – FC Basel");
    expect(row?.href).toBe("/dashboard/matchcenter/match-1");
    expect(row?.compactSecondary).toContain("Spiel");
  });

  it("D — missing target is unavailable without crashing", async () => {
    prismaMocks.eventFindMany.mockResolvedValue([]);
    const map = await resolveTaskContextsBatch(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW]),
      [{ contextType: "MATCH", contextId: "gone" }],
      "de-CH",
      "Europe/Zurich",
    );
    const row = map.get("MATCH:gone");
    expect(row?.unavailable).toBe(true);
    expect(row?.title).toBe("Kontext nicht mehr verfügbar");
  });
});
