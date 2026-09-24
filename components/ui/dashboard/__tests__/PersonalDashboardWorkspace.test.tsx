/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import deMessages from "@/messages/de.json";
import { PersonalDashboardWorkspace } from "../PersonalDashboardWorkspace";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";

vi.mock("@/components/ui/calendar/PersonalProgrammeMonthCalendar", () => ({
  default: ({
    onSelectedDayChange,
  }: {
    onSelectedDayChange?: (dayKey: string) => void;
  }) => (
    <button
      type="button"
      data-testid="mock-select-day"
      onClick={() => onSelectedDayChange?.("2026-09-27")}
    >
      Select day
    </button>
  ),
}));

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
        programmeItems={[baseItem]}
        programmeSupported
        timeLabelById={{ "event-1": "17:00" }}
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        navigation={{
          previousMonthHref: "/dashboard?monat=2026-08",
          nextMonthHref: "/dashboard?monat=2026-10",
          todayHref: "/dashboard?monat=2026-09",
        }}
      />
    </NextIntlClientProvider>,
  );
}

describe("PersonalDashboardWorkspace", () => {
  it("highlights programme rows when calendar day changes", () => {
    renderWorkspace();
    fireEvent.click(screen.getByTestId("mock-select-day"));
    expect(document.querySelector('[data-programme-day-row="highlighted"]')).toBeTruthy();
  });
});
