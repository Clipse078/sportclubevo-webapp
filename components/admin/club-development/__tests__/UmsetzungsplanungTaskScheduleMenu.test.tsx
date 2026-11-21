/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import UmsetzungsplanungTaskScheduleMenu from "../UmsetzungsplanungTaskScheduleMenu";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";

const phaseOptions = [
  { id: "active-1", slug: "saisonstart", title: "Saisonstart Junioren", status: "ACTIVE" as const },
  { id: "planned-1", slug: "trainer", title: "Trainergewinnung", status: "PLANNED" as const },
  { id: "planned-2", slug: "herbst", title: "Trainingsplanung Herbst", status: "PLANNED" as const },
  { id: "done-1", slug: "done", title: "Abgeschlossen", status: "COMPLETED" as const },
];

describe("UmsetzungsplanungTaskScheduleMenu", () => {
  it("lists named phase destinations at the first menu level under Laufend and Geplant", () => {
    const onMoveToPhase = vi.fn();
    render(
      <UmsetzungsplanungTaskScheduleMenu
        taskId="task-1"
        taskTitle="Testaufgabe"
        phaseOptions={phaseOptions}
        canSchedule
        onMoveToPhase={onMoveToPhase}
        testId="schedule-menu"
      />,
    );

    fireEvent.click(screen.getByTestId("schedule-menu-trigger"));

    expect(screen.getByTestId("schedule-menu-menu")).toBeTruthy();
    expect(screen.getByText(CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskMoveToPhaseMenuHeading)).toBeTruthy();
    expect(screen.getByText("Laufend")).toBeTruthy();
    expect(screen.getByText("Geplant")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Saisonstart Junioren" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Trainergewinnung" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Trainingsplanung Herbst" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Abgeschlossen" })).toBeNull();

    fireEvent.click(screen.getByRole("menuitem", { name: "Trainergewinnung" }));
    expect(onMoveToPhase).toHaveBeenCalledWith("task-1", "planned-1");
  });

  it("excludes the source phase from destination actions", () => {
    render(
      <UmsetzungsplanungTaskScheduleMenu
        taskId="task-1"
        taskTitle="Testaufgabe"
        phaseOptions={phaseOptions}
        sourcePhaseId="planned-1"
        canSchedule
        onMoveToPhase={vi.fn()}
        testId="schedule-menu"
      />,
    );

    fireEvent.click(screen.getByTestId("schedule-menu-trigger"));
    expect(screen.queryByRole("menuitem", { name: "Trainergewinnung" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Saisonstart Junioren" })).toBeTruthy();
  });

  it("opens with empty destination copy when no eligible phases exist", () => {
    render(
      <UmsetzungsplanungTaskScheduleMenu
        taskId="task-1"
        taskTitle="Testaufgabe"
        phaseOptions={[]}
        canSchedule
        onMoveToPhase={vi.fn()}
        testId="schedule-menu"
      />,
    );

    fireEvent.click(screen.getByTestId("schedule-menu-trigger"));
    const menu = screen.getByTestId("schedule-menu-menu");
    expect(within(menu).getByTestId("schedule-menu-empty")).toBeTruthy();
    expect(within(menu).getByText(CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskScheduleDestinationEmpty)).toBeTruthy();
  });

  it("shows Nach Ungeplant only for scheduled tasks when permitted", () => {
    const onReturn = vi.fn().mockResolvedValue(undefined);
    render(
      <UmsetzungsplanungTaskScheduleMenu
        taskId="task-1"
        taskTitle="Testaufgabe"
        phaseOptions={phaseOptions}
        sourcePhaseId="active-1"
        canSchedule
        canReturnToUnplanned
        onMoveToPhase={vi.fn()}
        onReturnToUnplanned={onReturn}
        testId="schedule-menu"
      />,
    );

    fireEvent.click(screen.getByTestId("schedule-menu-trigger"));
    fireEvent.click(screen.getByTestId("schedule-menu-return-unplanned"));
    expect(onReturn).toHaveBeenCalledWith("task-1");
  });

  it("surfaces save errors from move actions", async () => {
    const onMoveToPhase = vi.fn().mockRejectedValue(new Error("Speichern verweigert"));
    render(
      <UmsetzungsplanungTaskScheduleMenu
        taskId="task-1"
        taskTitle="Testaufgabe"
        phaseOptions={phaseOptions}
        canSchedule
        onMoveToPhase={onMoveToPhase}
        testId="schedule-menu"
      />,
    );

    fireEvent.click(screen.getByTestId("schedule-menu-trigger"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Saisonstart Junioren" }));
    await vi.waitFor(() => {
      expect(screen.getByTestId("schedule-menu-error")).toHaveTextContent("Speichern verweigert");
    });
  });

  it("renders a non-interactive trigger when scheduling is denied", () => {
    render(
      <UmsetzungsplanungTaskScheduleMenu
        taskId="task-1"
        taskTitle="Testaufgabe"
        phaseOptions={phaseOptions}
        canSchedule={false}
        onMoveToPhase={vi.fn()}
        testId="schedule-menu"
      />,
    );

    expect(screen.queryByTestId("schedule-menu-trigger")).toBeNull();
  });
});