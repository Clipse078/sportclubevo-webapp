/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import deMessages from "@/messages/de.json";
import { PersonalDashboardWorkspace } from "../PersonalDashboardWorkspace";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";

const baseItem: PersonalProgrammeItem = {
  id: "event-1",
  sourceType: "TRAINING",
  startsAt: new Date("2026-09-27T15:00:00.000Z"),
  title: "F2 Training",
  deepLink: "/dashboard/planner/edit/event-1",
  typeLabel: "Training",
  contextLabel: "F2 · Trainer",
  ariaLabel: "Training: F2 Training",
};

function renderWorkspace() {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <PersonalDashboardWorkspace
        groups={[
          {
            dayKey: "2026-09-27",
            labelKind: "date",
            dateLabel: "Sonntag, 27. September",
            items: [baseItem],
          },
        ]}
        programmeSupported
        timeLabelById={{ "event-1": "17:00" }}
        monthParam="2026-09"
      />
    </NextIntlClientProvider>,
  );
}

describe("PersonalDashboardWorkspace", () => {
  it("spans Mein Programm across the cockpit grid and omits embedded calendar", () => {
    renderWorkspace();
    expect(screen.getByTestId("personal-programme-open-calendar")).toBeTruthy();
    expect(screen.queryByTestId("mock-select-day")).toBeNull();
    expect(screen.queryByTestId("personal-calendar-open")).toBeNull();

    const grid = screen.getByTestId("dashboard-cockpit-grid");
    const programmeCard = screen.getByTestId("personal-dashboard-workspace");
    expect(programmeCard).toBeTruthy();
    expect(grid.textContent).toContain("Mein Programm");
  });
});
