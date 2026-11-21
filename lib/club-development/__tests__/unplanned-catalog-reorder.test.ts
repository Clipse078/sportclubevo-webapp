import { describe, expect, it } from "vitest";
import { applyUnplannedOrderToCatalog } from "../unplanned-catalog-reorder";
import type { SprintPlanningCatalogDto } from "../sprints/sprint-planning-types";

describe("applyUnplannedOrderToCatalog", () => {
  it("assigns unplannedRank following the provided id list", () => {
    const catalog: SprintPlanningCatalogDto = {
      initiativeGroups: [
        {
          initiativeId: "i1",
          title: "Init",
          slug: "init",
          tasks: [
            {
              id: "t2",
              title: "B",
              status: "OPEN",
              statusLabel: "Offen",
              assignees: [],
              assigneeLabels: [],
              dueAt: null,
              selectable: true,
              inTargetSprint: false,
              otherSprintTitle: null,
              exclusionReason: null,
              targetId: null,
              targetTitle: null,
              strategyId: null,
              strategyTitle: null,
              orgUnitLabel: null,
              taskHref: "/tasks/t2",
            },
          ],
        },
      ],
      standaloneGroup: {
        tasks: [
          {
            id: "t1",
            title: "A",
            status: "OPEN",
            statusLabel: "Offen",
            assignees: [],
            assigneeLabels: [],
            dueAt: null,
            selectable: true,
            inTargetSprint: false,
            otherSprintTitle: null,
            exclusionReason: null,
            targetId: null,
            targetTitle: null,
            strategyId: null,
            strategyTitle: null,
            orgUnitLabel: null,
            taskHref: "/tasks/t1",
          },
        ],
      },
    };

    const next = applyUnplannedOrderToCatalog(catalog, ["t1", "t2"]);
    expect(next.standaloneGroup.tasks[0]?.unplannedRank).toBe(1);
    expect(next.initiativeGroups[0]?.tasks[0]?.unplannedRank).toBe(2);
  });
});