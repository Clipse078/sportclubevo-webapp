/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import deMessages from "@/messages/de.json";
import VeranstaltungRecurrenceFields, {
  type VeranstaltungRecurrenceFieldValues,
} from "@/components/admin/veranstaltungen/VeranstaltungRecurrenceFields";
import type { VeranstaltungScheduleFieldValues } from "@/components/admin/veranstaltungen/VeranstaltungScheduleFields";

const schedule: VeranstaltungScheduleFieldValues = {
  allDay: false,
  startDate: "2026-11-03",
  endDate: "2026-11-03",
  startTime: "18:30",
  endTime: "21:00",
};

const vlRecurrence: VeranstaltungRecurrenceFieldValues = {
  enabled: true,
  frequency: "MONTHLY",
  intervalCount: 1,
  weekday: "TUESDAY",
  monthlyPatternKind: "ORDINAL_WEEKDAY",
  monthDay: 15,
  monthOrdinal: "FIRST",
  endMode: "AFTER_COUNT",
  endDate: "",
  occurrenceCount: 8,
};

function renderFields(
  scheduleValues: VeranstaltungScheduleFieldValues,
  recurrenceValues: VeranstaltungRecurrenceFieldValues,
) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <VeranstaltungRecurrenceFields
        schedule={scheduleValues}
        values={recurrenceValues}
        onChange={() => {}}
        timeZone="Europe/Zurich"
      />
    </NextIntlClientProvider>,
  );
}

describe("VeranstaltungRecurrenceFields — R1.1 UX", () => {
  it("uses natural-language interval sentence instead of Intervall label", () => {
    renderFields(schedule, vlRecurrence);
    expect(screen.getByTestId("veranstaltung-recurrence-interval-sentence")).toHaveTextContent(
      "Alle",
    );
    expect(screen.getByTestId("veranstaltung-recurrence-interval-sentence")).toHaveTextContent(
      "Monat",
    );
    expect(screen.queryByText("Intervall")).toBeNull();
    expect(screen.queryByText(/RRULE/i)).toBeNull();
  });

  it("composes end-by-count as Nach … Terminen", () => {
    renderFields(schedule, vlRecurrence);
    const block = screen.getByTestId("veranstaltung-recurrence-end-by-count");
    expect(block).toHaveTextContent("Nach");
    expect(block).toHaveTextContent("Terminen");
    expect(screen.queryByText("Anzahl Termine")).toBeNull();
  });

  it("shows VL summary and canonical preview dates", () => {
    renderFields(schedule, vlRecurrence);
    const preview = screen.getByTestId("veranstaltung-recurrence-preview");
    expect(preview).toHaveTextContent("Zusammenfassung");
    expect(preview).toHaveTextContent("Jeden ersten Dienstag im Monat · 18:30–21:00");
    expect(preview).toHaveTextContent("8 Termine");
    expect(preview.textContent).toContain("03.11.2026");
    expect(preview.textContent).toContain("01.12.2026");
    expect(preview.textContent).toContain("05.01.2027");
    expect(preview.textContent).toContain("02.02.2027");
    expect(preview).toHaveTextContent("+ weitere Termine");
  });

  it("shows helper when start date is missing", () => {
    renderFields({ ...schedule, startDate: "" }, vlRecurrence);
    expect(screen.getByTestId("veranstaltung-recurrence-missing-start-date")).toHaveTextContent(
      "Datum festlegen, um die Termine der Serie anzuzeigen.",
    );
    expect(screen.queryByTestId("veranstaltung-recurrence-preview")).toBeNull();
  });

  it("uses Woche/Wochen for weekly interval", () => {
    renderFields(schedule, {
      ...vlRecurrence,
      frequency: "WEEKLY",
      intervalCount: 2,
    });
    expect(screen.getByTestId("veranstaltung-recurrence-interval-sentence")).toHaveTextContent(
      "Wochen",
    );
  });
});
