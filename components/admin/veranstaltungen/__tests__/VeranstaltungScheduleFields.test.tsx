/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import deMessages from "@/messages/de.json";
import VeranstaltungCreateForm from "@/components/admin/veranstaltungen/VeranstaltungCreateForm";
import VeranstaltungEditForm from "@/components/admin/veranstaltungen/VeranstaltungEditForm";
import VeranstaltungScheduleFields, {
  type VeranstaltungScheduleFieldValues,
} from "@/components/admin/veranstaltungen/VeranstaltungScheduleFields";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const baseValues: VeranstaltungScheduleFieldValues = {
  allDay: false,
  startDate: "2026-09-25",
  endDate: "2026-09-25",
  startTime: "18:00",
  endTime: "20:00",
};

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function renderFields(
  values: VeranstaltungScheduleFieldValues = baseValues,
  onChange = vi.fn(),
) {
  return renderWithIntl(
    <VeranstaltungScheduleFields values={values} onChange={onChange} />,
  );
}

describe("VeranstaltungScheduleFields — Ganztägig switch (SCE-EVENTS-01B)", () => {
  it("renders Ganztägig as role=switch, not a checkbox", () => {
    renderFields();

    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
    const toggle = screen.getByRole("switch", { name: "Ganztägig" });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("shows Beginn/Ende time inputs when OFF and hides them when ON", () => {
    const onChange = vi.fn();
    const { rerender } = renderWithIntl(
      <VeranstaltungScheduleFields values={baseValues} onChange={onChange} />,
    );

    expect(document.querySelectorAll('input[type="time"]')).toHaveLength(2);

    fireEvent.click(screen.getByRole("switch", { name: "Ganztägig" }));
    expect(onChange).toHaveBeenCalledWith({ allDay: true });

    rerender(
      <NextIntlClientProvider locale="de" messages={deMessages}>
        <VeranstaltungScheduleFields
          values={{ ...baseValues, allDay: true }}
          onChange={onChange}
        />
      </NextIntlClientProvider>,
    );

    expect(document.querySelectorAll('input[type="time"]')).toHaveLength(0);
    expect(screen.getByRole("switch", { name: "Ganztägig" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getAllByLabelText(/^Ende$/).some((el) => el.getAttribute("type") === "date")).toBe(
      true,
    );
  });

  it("restores timed mode when toggled OFF", () => {
    const onChange = vi.fn();
    renderFields({ ...baseValues, allDay: true }, onChange);

    fireEvent.click(screen.getByRole("switch", { name: "Ganztägig" }));
    expect(onChange).toHaveBeenCalledWith({ allDay: false });
  });

  it("supports keyboard activation on the canonical switch button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFields(baseValues, onChange);

    const toggle = screen.getByRole("switch", { name: "Ganztägig" });
    expect(toggle.tagName).toBe("BUTTON");
    for (let i = 0; i < 8 && document.activeElement !== toggle; i += 1) {
      await user.tab();
    }
    expect(toggle).toHaveFocus();
    await user.keyboard("[Space]");
    expect(onChange).toHaveBeenCalledWith({ allDay: true });
  });

  it("create and edit forms expose the same Ganztägig switch (shared schedule fields)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        currentSeasonKey: "2026-27",
        nextSeasonKey: null,
        seasons: [
          {
            id: "season-1",
            key: "2026-27",
            name: "2026/27",
            isActive: true,
            startDate: "2026-07-01",
            endDate: "2027-06-30",
          },
        ],
      }),
    }) as typeof fetch;

    const { unmount: unmountCreate } = renderWithIntl(<VeranstaltungCreateForm />);
    expect(await screen.findByRole("switch", { name: "Ganztägig" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    unmountCreate();

    renderWithIntl(
      <VeranstaltungEditForm
        timeZone="Europe/Zurich"
        event={{
          id: "evt-1",
          title: "Fest",
          description: null,
          location: null,
          startAt: "2026-09-25T16:00:00.000Z",
          endAt: "2026-09-25T18:00:00.000Z",
          allDay: true,
          organizerName: null,
          remarks: null,
          status: "SCHEDULED",
          source: "MANUAL",
          websiteVisible: true,
          infoboardVisible: false,
          homepageVisible: false,
          wochenplanVisible: false,
          trainingsplanVisible: false,
          teamPageVisible: false,
          season: { id: "season-1", key: "2026-27", name: "2026/27" },
        }}
      />,
    );

    expect(screen.getByRole("switch", { name: "Ganztägig" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(screen.getAllByRole("switch")).toHaveLength(4);
  });
});
