/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import deMessages from "@/messages/de.json";
import VeranstaltungCreateForm from "@/components/admin/veranstaltungen/VeranstaltungCreateForm";
import type { ClubEventComposerDraftPayload } from "@/lib/club-events/composer/club-event-composer-draft-types";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/veranstaltungen/new",
  useSearchParams: () => new URLSearchParams("draftId=draft-abc"),
}));

vi.mock("@/hooks/use-facility-availability", () => ({
  useFacilityAvailability: () => ({
    pitchAvailability: new Map(),
    dressingRoomAvailability: new Map(),
  }),
}));

const governance: SceActivityEffectiveGovernance = {
  activityType: "CLUB_EVENT",
  personId: "person-1",
  mayCreate: true,
  publicationAuthority: "DIRECT_PUBLISH",
  approvalStrategy: "ANY_ONE",
  validatorPersonIds: [],
};

const draftPayload: ClubEventComposerDraftPayload = {
  seasonId: "season-persisted",
  title: "Entwurf Titel",
  category: "Vereinsanlass",
  description: "Desc",
  location: "Ort",
  organizerName: "Org",
  remarks: "Rem",
  schedule: {
    allDay: false,
    startDate: "2026-12-01",
    endDate: "2026-12-01",
    startTime: "17:00",
    endTime: "19:00",
  },
  audience: { scope: "CLUB_WIDE", targets: [] },
  ausspielung: { websiteVisible: false, homepageVisible: true, wochenplanVisible: false },
  recurrence: {
    enabled: false,
    frequency: "MONTHLY",
    intervalCount: 1,
    weekday: "MONDAY",
    monthlyPatternKind: "DAY_OF_MONTH",
    monthDay: 1,
    monthOrdinal: "FIRST",
    endMode: "ON_DATE",
    endDate: "",
    occurrenceCount: 12,
  },
  resources: [],
};

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("VeranstaltungCreateForm — persisted draft resume", () => {
  it("hydrates fields and shows Änderungen speichern for server-resumed draft", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        seasons: [
          {
            id: "season-persisted",
            key: "2025-26",
            name: "2025/2026",
            isActive: false,
            startDate: "2025-07-01",
            endDate: "2026-06-30",
          },
          {
            id: "season-active",
            key: "2026-27",
            name: "2026/2027",
            isActive: true,
            startDate: "2026-07-01",
            endDate: "2027-06-30",
          },
        ],
      }),
    }) as typeof fetch;

    renderWithIntl(
      <VeranstaltungCreateForm
        pitchHallFacilityGroups={[]}
        dressingRoomFacilityGroups={[]}
        effectiveGovernance={governance}
        initialDraftId="draft-abc"
        initialResumeDraft={{ draftId: "draft-abc", payload: draftPayload }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Entwurf Titel")).toBeInTheDocument();
    });

    const seasonSelect = document.querySelector("select.fca-select");
    expect(seasonSelect).toHaveValue("season-persisted");

    expect(screen.getByRole("heading", { name: "Entwurf Titel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Änderungen speichern" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Als Entwurf speichern" })).not.toBeInTheDocument();
  });
});
