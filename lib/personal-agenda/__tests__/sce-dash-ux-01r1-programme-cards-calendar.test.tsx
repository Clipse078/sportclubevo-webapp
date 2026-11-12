/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalProgrammeCanonicalAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow";
import { SceProgrammeActivityDateTile } from "@/components/sporting-activity/SceProgrammeActivityDateTile";
import { buildProgrammeCalendarMicroEntry } from "@/lib/programme-engine/programme-calendar-presentation";
import { resolveSceMeetingPresentationFromProgramme } from "@/lib/sporting-activity-presentation/canonical/adapters/meeting-programme";
import { createSceTrainingCardFixtureSession } from "@/components/sporting-activity/__fixtures__/sce-training-card-fixtures";
import type { PersonalProgrammeItem } from "../personal-programme-types";
import type { ProgrammeItem } from "@/lib/programme-engine/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

describe("SCE-DASH-UX-01R1 — calendar German labels", () => {
  it("programme calendar micro uses German training label", () => {
    const item: ProgrammeItem = {
      id: "TRAINING:tr1",
      kind: "TRAINING",
      domainId: "tr1",
      resourceKey: "training:tr1",
      startsAt: new Date("2026-10-20T16:45:00.000Z"),
      endsAt: null,
      allDay: false,
      presentation: createSceTrainingCardFixtureSession(),
      teamId: "team-1",
      teamSeasonId: null,
      orgUnitId: null,
      navigationTarget: "/training/tr1",
    };
    const entry = buildProgrammeCalendarMicroEntry(item, FMT);
    expect(entry.typeLabel).toBe("Training");
  });
});

describe("SCE-DASH-UX-01R1 — shared programme card shell", () => {
  it("renders compact date tile without truncating day number", () => {
    render(
      <SceProgrammeActivityDateTile
        startAt={new Date("2026-11-15T17:00:00.000Z")}
        fmtCfg={FMT}
      />,
    );
    const tile = screen.getByTestId("sce-programme-activity-date-tile");
    expect(tile).toBeInTheDocument();
    expect(screen.getByTestId("sce-programme-date-tile-day").textContent?.length).toBeGreaterThan(0);
  });

  it("meeting programme row shows title, time and Sitzung type", () => {
    const model = resolveSceMeetingPresentationFromProgramme({
      meetingId: "m-1",
      slug: "sitzung",
      title: "Vorstandssitzung November",
      meetingDate: new Date("2026-11-15T17:00:00.000Z"),
      location: "Clubhaus",
      contextLabel: "Vorstand",
    });
    const item: PersonalProgrammeItem = {
      id: "meeting:m-1",
      sourceType: "MEETING",
      startsAt: new Date("2026-11-15T17:00:00.000Z"),
      title: model.meetingTitle,
      typeLabel: "Sitzung",
      deepLink: model.route.consumeHref!,
      ariaLabel: "Sitzung: Vorstandssitzung November",
      canonicalPresentation: model,
    };

    render(<PersonalProgrammeCanonicalAgendaRow item={item} fmtCfg={FMT} density="STANDARD" />);

    expect(screen.getByTestId("sce-programme-activity-date-tile")).toBeInTheDocument();
    expect(screen.getByTestId("sce-meeting-title")).toHaveTextContent("Vorstandssitzung November");
    expect(screen.getByTestId("sce-meeting-list-row-time")).toBeInTheDocument();
    expect(screen.getByText("Sitzung")).toBeInTheDocument();
  });

  it("wraps long German titles with break-words in reference layout", () => {
    const model = resolveSceMeetingPresentationFromProgramme({
      meetingId: "m-long",
      slug: "lang",
      title:
        "Ausserordentliche Generalversammlung mit sehr langem Titel für Mein Programm Kartenlayout",
      meetingDate: new Date("2026-11-15T17:00:00.000Z"),
    });
    const item: PersonalProgrammeItem = {
      id: "meeting:m-long",
      sourceType: "MEETING",
      startsAt: new Date("2026-11-15T17:00:00.000Z"),
      title: model.meetingTitle,
      typeLabel: "Sitzung",
      deepLink: "/vereinsleitung/meetings/lang",
      ariaLabel: "Sitzung",
      canonicalPresentation: model,
    };
    render(<PersonalProgrammeCanonicalAgendaRow item={item} fmtCfg={FMT} />);
    const title = screen.getByTestId("sce-meeting-title");
    expect(title.className).toMatch(/break-words/);
  });
});
