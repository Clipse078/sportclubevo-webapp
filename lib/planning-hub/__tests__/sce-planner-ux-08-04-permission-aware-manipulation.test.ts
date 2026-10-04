import { describe, expect, it } from "vitest";
import { getSchedulerManipulationCapabilities } from "../manipulation-capabilities";
import {
  assertActivityTimeMutationPermitted,
  assertManipulationTenantScope,
  assertResourceReservationMutationPermitted,
  canMutateActivityTimeForItem,
  canMutateResourceReservationForItem,
  ManipulationForbiddenError,
  MANIPULATION_PERMISSION_DENIED_MESSAGE,
  formatManipulationHttpError,
} from "../manipulation-server-authorization";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

function training(overrides: Partial<WeekplannerItem> = {}): WeekplannerItem {
  return {
    id: "training:t1",
    tenantId: "tenant-a",
    type: "TRAINING",
    startAt: new Date("2026-09-20T15:00:00.000Z"),
    endAt: new Date("2026-09-20T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-09-20T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-09-20T16:30:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: ["F2"],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    trainingSeriesId: "s1",
    trainingSessionId: "sess-1",
    teamSeasonId: "ts1",
    ...overrides,
  } as WeekplannerItem;
}

const match = training({
  type: "MATCH",
  eventId: "ev-1",
  trainingSessionId: undefined,
  eventSource: "MANUAL",
} as Partial<WeekplannerItem>);

describe("SCE-PLANNER-UX-08-04 permission-aware manipulation", () => {
  describe("domain separation", () => {
    it("resource-only manager can mutate reservations but not activity time", () => {
      const actor = {
        canManageTrainings: false,
        canManageEvents: false,
        canManageAllocations: true,
      };
      expect(canMutateResourceReservationForItem(training(), actor)).toBe(true);
      expect(canMutateActivityTimeForItem(training(), actor)).toBe(false);

      const caps = getSchedulerManipulationCapabilities(training(), {
        isStandardplan: true,
        ...actor,
        alternativePlanId: null,
        resourceCategory: "pitch",
        manipulationSurface: "resourceTimeline",
      });
      expect(caps.canMoveResourceOccupancy).toBe(true);
      expect(caps.canMoveTime).toBe(false);

      const kalender = getSchedulerManipulationCapabilities(training(), {
        isStandardplan: true,
        ...actor,
        alternativePlanId: null,
        resourceCategory: "pitch",
        manipulationSurface: "kalender",
      });
      expect(kalender.canMoveTime).toBe(false);
      expect(kalender.canResize).toBe(false);
    });

    it("training manager can mutate activity time and linked resource reservations", () => {
      const actor = {
        canManageTrainings: true,
        canManageEvents: false,
        canManageAllocations: false,
      };
      expect(canMutateActivityTimeForItem(training(), actor)).toBe(true);
      expect(canMutateResourceReservationForItem(training(), actor)).toBe(true);
    });

    it("event manager without allocations flag cannot mutate training resources", () => {
      const actor = {
        canManageTrainings: false,
        canManageEvents: true,
        canManageAllocations: false,
      };
      expect(canMutateResourceReservationForItem(training(), actor)).toBe(false);
      expect(canMutateActivityTimeForItem(training(), actor)).toBe(false);
      expect(canMutateResourceReservationForItem(match, actor)).toBe(true);
    });
  });

  describe("tenant isolation", () => {
    it("rejects cross-tenant item scope", () => {
      expect(() => assertManipulationTenantScope(training(), "tenant-b")).toThrow(
        ManipulationForbiddenError,
      );
      expect(() =>
        assertActivityTimeMutationPermitted(training(), {
          canManageTrainings: true,
          canManageEvents: false,
          canManageAllocations: false,
        }),
      ).not.toThrow();
    });
  });

  describe("server assertion helpers", () => {
    it("assertResourceReservationMutationPermitted denies activity-only training manager for wrong domain", () => {
      expect(() =>
        assertResourceReservationMutationPermitted(training(), {
          canManageTrainings: false,
          canManageEvents: true,
          canManageAllocations: false,
        }),
      ).toThrow(MANIPULATION_PERMISSION_DENIED_MESSAGE);
    });

    it("maps HTTP 403 to user-facing German copy", () => {
      expect(formatManipulationHttpError(403, "Forbidden")).toBe(
        MANIPULATION_PERMISSION_DENIED_MESSAGE,
      );
      expect(formatManipulationHttpError(403, "SFV-Spiel kann nicht verschoben werden.")).toBe(
        "SFV-Spiel kann nicht verschoben werden.",
      );
    });
  });
});
