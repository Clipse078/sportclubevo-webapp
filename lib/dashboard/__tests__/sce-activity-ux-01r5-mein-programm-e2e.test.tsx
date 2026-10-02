/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalProgrammeAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeAgendaRow";
import {
  buildMatchActivityPresentation,
  buildTournamentActivityPresentation,
  buildTrainingActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";
import {
  encodePersonalDashboardReadModelPayload,
  parsePersonalDashboardReadModelPayload,
} from "@/lib/dashboard/read-model/payload-codec";
import { PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION } from "@/lib/dashboard/read-model/constants";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "de-CH",
}));

function renderFromReadModelItem(item: PersonalProgrammeItem, timeLabel: string) {
  render(<PersonalProgrammeAgendaRow item={item} timeLabel={timeLabel} />);
}

describe("SCE-ACTIVITY-UX-01R5 — Mein Programm read-model to row", () => {
  it("TRAINING: adapter-shaped presentation survives payload round-trip and renders club - location", () => {
    const activityPresentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:1",
      title: "Junioren F2 Training",
      typeLabel: "Training",
      teamName: "FC Allschwil Junioren F2",
      clubName: "FC Allschwil",
      startAt: new Date("2026-10-05T15:00:00.000Z"),
      facilityName: "Im Brüel",
      pitchResourceName: "KR2",
    });

    const payload = {
      v: PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION,
      scopeHints: {
        participationNavCapable: true,
        requirementRecipientCapable: false,
        hasLinkedPerson: true,
        hasActiveTenantMembership: true,
      },
      programme: {
        supported: true,
        items: [
          {
            id: "training:1",
            sourceType: "TRAINING" as const,
            startsAt: new Date("2026-10-05T15:00:00.000Z"),
            title: "Junioren F2 Training",
            typeLabel: "Training",
            ariaLabel: "Training",
            activityPresentation,
          },
        ],
      },
      personalWork: {
        attentionItems: [],
        attentionTotalCount: 0,
        viewAllHref: null,
        operationalSourcesDegraded: false,
        taskCount: 0,
        taskPreview: [],
      },
    };

    const decoded = parsePersonalDashboardReadModelPayload(
      encodePersonalDashboardReadModelPayload(payload),
    );
    const item = decoded!.programme.items[0]!;

    renderFromReadModelItem(item, "17:00");

    expect(screen.getByText("Junioren F2 Training")).toBeInTheDocument();
    expect(screen.getByText("FC Allschwil - Im Brüel")).toBeInTheDocument();
    expect(screen.queryByText("TRAINING")).not.toBeInTheDocument();
    expect(screen.queryByText("KR2")).not.toBeInTheDocument();
    expect(screen.queryByText("FC Allschwil Junioren F2")).not.toBeInTheDocument();
  });

  it("TOURNAMENT AWAY: organiser - location and Auswärts after payload round-trip", () => {
    const activityPresentation = buildTournamentActivityPresentation({
      resourceKey: "event:t1",
      title: "PlayMore Turnier",
      typeLabel: "Turnier",
      teamName: "FC Allschwil Junioren F2",
      organiserName: "FC Arisdorf",
      homeAway: "AWAY",
      location: "Gemeindesportplatz",
      startAt: new Date("2026-10-10T07:30:00.000Z"),
    });

    const payload = {
      v: PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION,
      scopeHints: {
        participationNavCapable: true,
        requirementRecipientCapable: false,
        hasLinkedPerson: true,
        hasActiveTenantMembership: true,
      },
      programme: {
        supported: true,
        items: [
          {
            id: "event:t1",
            sourceType: "TOURNAMENT" as const,
            startsAt: new Date("2026-10-10T07:30:00.000Z"),
            title: "PlayMore Turnier",
            typeLabel: "Turnier",
            ariaLabel: "Turnier",
            activityPresentation,
          },
        ],
      },
      personalWork: {
        attentionItems: [],
        attentionTotalCount: 0,
        viewAllHref: null,
        operationalSourcesDegraded: false,
        taskCount: 0,
        taskPreview: [],
      },
    };

    const item = parsePersonalDashboardReadModelPayload(
      encodePersonalDashboardReadModelPayload(payload),
    )!.programme.items[0]!;

    renderFromReadModelItem(item, "09:30");

    expect(screen.getByText("PlayMore Turnier")).toBeInTheDocument();
    expect(screen.getByText("FC Arisdorf - Gemeindesportplatz")).toBeInTheDocument();
    expect(screen.getByText("Auswärts")).toBeInTheDocument();
    expect(screen.queryByText("TURNIER")).not.toBeInTheDocument();
  });

  it("MATCH HOME and AWAY compact lines", () => {
    const homePresentation = buildMatchActivityPresentation({
      resourceKey: "event:home",
      title: "Spiel",
      typeLabel: "Spiel",
      teamName: "2. Mannschaft",
      opponentName: "FC Bubendorf",
      homeAway: "HOME",
      location: "Im Brüel",
      startAt: new Date("2026-10-12T16:00:00.000Z"),
      tenantClubName: "FC Allschwil",
    });

    const { unmount } = render(
      <PersonalProgrammeAgendaRow
        item={{
          id: "event:home",
          sourceType: "MATCH",
          startsAt: new Date("2026-10-12T16:00:00.000Z"),
          title: "Spiel",
          typeLabel: "Spiel",
          ariaLabel: "Spiel",
          activityPresentation: homePresentation,
        }}
        timeLabel="18:00"
      />,
    );

    expect(screen.getByText("FC Allschwil - Im Brüel")).toBeInTheDocument();
    expect(screen.getByText("Eigener Verein")).toBeInTheDocument();
    unmount();

    const awayPresentation = buildMatchActivityPresentation({
      resourceKey: "event:away",
      title: "Spiel",
      typeLabel: "Spiel",
      teamName: "Junioren F2",
      opponentName: "FC Arisdorf",
      homeAway: "AWAY",
      location: "Gemeindesportplatz",
      startAt: new Date("2026-10-12T16:00:00.000Z"),
      tenantClubName: "FC Allschwil",
    });

    render(
      <PersonalProgrammeAgendaRow
        item={{
          id: "event:away",
          sourceType: "MATCH",
          startsAt: new Date("2026-10-12T16:00:00.000Z"),
          title: "Spiel",
          typeLabel: "Spiel",
          ariaLabel: "Spiel",
          activityPresentation: awayPresentation,
        }}
        timeLabel="18:00"
      />,
    );

    expect(screen.getByText("FC Arisdorf - Gemeindesportplatz")).toBeInTheDocument();
    expect(screen.getByText("Auswärts")).toBeInTheDocument();
  });
});
