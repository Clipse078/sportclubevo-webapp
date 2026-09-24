import { describe, expect, it } from "vitest";
import {
  canActorReadEventType,
  canIncludeEventInPersonalProjection,
} from "../event-projection-access";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const actor = (permissionKeys: string[]) => ({
  userId: "user-a",
  tenantId: "tenant-a",
  permissionKeys,
});

describe("DASHBOARD-01 — event projection authorization", () => {
  it("requires module read permission for match events", () => {
    expect(canActorReadEventType(actor([]), "MATCH")).toBe(false);
    expect(canActorReadEventType(actor([PERMISSIONS.EVENTS_VIEW]), "MATCH")).toBe(true);
  });

  it("excludes DRAFT events for view-only actors", () => {
    const row = {
      id: "e1",
      tenantId: "tenant-a",
      teamId: "team-1",
      type: "MATCH" as const,
      status: "SCHEDULED",
      reviewStage: "DRAFT" as const,
    };
    expect(
      canIncludeEventInPersonalProjection(actor([PERMISSIONS.EVENTS_VIEW]), row),
    ).toBe(false);
  });

  it("includes APPROVED events for view-only actors with permission", () => {
    const row = {
      id: "e1",
      tenantId: "tenant-a",
      teamId: "team-1",
      type: "MATCH" as const,
      status: "SCHEDULED",
      reviewStage: "APPROVED" as const,
    };
    expect(
      canIncludeEventInPersonalProjection(actor([PERMISSIONS.EVENTS_VIEW]), row),
    ).toBe(true);
  });

  it("includes cancelled events for programme presentation", () => {
    const row = {
      id: "e1",
      tenantId: "tenant-a",
      teamId: "team-1",
      type: "TRAINING" as const,
      status: "CANCELLED",
      reviewStage: "APPROVED" as const,
    };
    expect(
      canIncludeEventInPersonalProjection(actor([PERMISSIONS.TRAININGS_VIEW]), row),
    ).toBe(true);
  });

  it("blocks cross-tenant events", () => {
    const row = {
      id: "e1",
      tenantId: "tenant-b",
      teamId: "team-1",
      type: "MATCH" as const,
      status: "SCHEDULED",
      reviewStage: "APPROVED" as const,
    };
    expect(
      canIncludeEventInPersonalProjection(actor([PERMISSIONS.EVENTS_VIEW]), row),
    ).toBe(false);
  });
});
