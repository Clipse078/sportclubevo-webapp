import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DayPlannerPlanSelect } from "@/components/admin/planner/DayPlannerPlanSelect";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("DS2-07G — DayPlannerPlanSelect accessibility", () => {
  it("associates the plan select with an accessible name", () => {
    render(
      <DayPlannerPlanSelect
        dayParam="2026-11-10"
        weekParam="2026-W46"
        plans={[
          {
            id: "plan-1",
            tenantId: "tenant-1",
            weekId: "2026-11-10",
            name: "Alternativ A",
            createdByUserId: null,
            createdAt: "2026-11-10T00:00:00.000Z",
            updatedAt: "2026-11-10T00:00:00.000Z",
            archivedAt: null,
            isActive: false,
            wochenplanPlanId: null,
          },
        ]}
        activePlanId={null}
      />,
    );
  const select = screen.getByTestId("dayplanner-plan-select");
  expect(select).toHaveAccessibleName("Tagesplan-Variante");
  expect(select).toHaveAttribute("name", "dayplannerPlan");
  });
});
