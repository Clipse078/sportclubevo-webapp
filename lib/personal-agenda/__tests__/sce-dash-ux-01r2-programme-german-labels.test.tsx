/**
 * @vitest-environment jsdom
 *
 * SCE-DASH-UX-01R2 — regression: dashboard must not show English MEETING on programme surfaces.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalProgrammeAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeAgendaRow";
import { PersonalProgrammeCanonicalAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow";
import { SceMeetingCard } from "@/components/sporting-activity/SceMeetingCard";
import type { PersonalProgrammeItem } from "../personal-programme-types";
import type { SceMeetingPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

function legacyMeetingItem(overrides: Partial<PersonalProgrammeItem> = {}): PersonalProgrammeItem {
  return {
    id: "meeting:m-legacy",
    sourceType: "MEETING",
    startsAt: new Date("2026-11-17T18:00:00.000Z"),
    title: "Vorstandssitzung",
    typeLabel: "Meeting",
    deepLink: "/vereinsleitung/meetings/vorstand",
    ariaLabel: "Sitzung: Vorstandssitzung",
    ...overrides,
  };
}

function meetingModelWithLegacyTypeLabel(): SceMeetingPresentationModel {
  return {
    kind: "MEETING",
    activityId: "m-legacy",
    resourceKey: "meeting:m-legacy",
    typeLabel: "Meeting",
    meetingTitle: "Vorstandssitzung",
    organisationalContext: "Vorstand",
    schedule: {
      startAt: "2026-11-17T18:00:00.000Z",
      endAt: null,
      allDay: false,
    },
    location: { mode: "UNKNOWN", venueName: "Clubhaus" },
    route: {
      resourceKey: "meeting:m-legacy",
      consumeHref: "/vereinsleitung/meetings/vorstand",
      manageHref: null,
    },
  };
}

describe("SCE-DASH-UX-01R2 — programme German activity labels", () => {
  it("degraded agenda row without canonical presentation shows SITZUNG not MEETING", () => {
    render(
      <PersonalProgrammeAgendaRow
        item={legacyMeetingItem()}
        timeLabel="19:00"
      />,
    );

    expect(screen.queryByText("MEETING")).toBeNull();
    expect(screen.getAllByText("SITZUNG").length).toBeGreaterThan(0);
  });

  it("canonical meeting card normalizes legacy cached typeLabel at render time", () => {
    const model = meetingModelWithLegacyTypeLabel();
    render(
      <SceMeetingCard
        model={model}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="programme-personal"
      />,
    );

    expect(screen.queryByText("MEETING")).toBeNull();
    expect(screen.getByText("Sitzung")).toBeInTheDocument();
  });

  it("dashboard canonical programme row shows German meeting pill with shared date tile", () => {
    const model = meetingModelWithLegacyTypeLabel();
    const item: PersonalProgrammeItem = {
      ...legacyMeetingItem(),
      canonicalPresentation: model,
    };

    render(<PersonalProgrammeCanonicalAgendaRow item={item} fmtCfg={FMT} />);

    expect(screen.getByTestId("sce-programme-activity-date-tile")).toBeInTheDocument();
    expect(screen.getByTestId("sce-meeting-title")).toHaveTextContent("Vorstandssitzung");
    expect(screen.queryByText("MEETING")).toBeNull();
  });
});
