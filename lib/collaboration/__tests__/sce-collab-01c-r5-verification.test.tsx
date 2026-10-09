/**
 * SCE-COLLAB-01C-R5 — audience option source parity (GET /api/teams response shape).
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import deMessages from "@/messages/de.json";
import { ActivityChangeCollaborationProvider } from "@/components/admin/collaboration/ActivityChangeCollaborationContext";
import { ContextualClubEventParticipationAudienceDialog } from "@/components/admin/collaboration/ContextualClubEventParticipationAudienceDialog";
import ClubEventParticipationAudienceEditor from "@/components/admin/veranstaltungen/ClubEventParticipationAudienceEditor";
import { parseTeamsListApiResponse } from "@/lib/teams/parse-teams-list-api-response";

const mocks = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <ActivityChangeCollaborationProvider>{children}</ActivityChangeCollaborationProvider>
    </NextIntlClientProvider>
  );
}

const CANONICAL_TEAMS_API = [
  {
    id: "team-f2",
    name: "FC Allschwil Junioren F2",
    isActive: true,
    activeSeason: { displayName: "Junioren F2" },
  },
  {
    id: "team-other-tenant",
    name: "Foreign Team",
    isActive: true,
  },
  {
    id: "team-inactive",
    name: "Archived Team",
    isActive: false,
  },
];

function mockFetchCanonical() {
  mocks.fetchMock.mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/teams")) {
      return { ok: true, json: async () => CANONICAL_TEAMS_API };
    }
    if (url.includes("/participation-audience") && init?.method === "POST") {
      return {
        ok: true,
        json: async () => ({
          entries: [{ id: "e1", kind: "TEAM", label: "Junioren F2", referenceId: "team-f2" }],
        }),
      };
    }
    if (url.includes("/participation-audience")) {
      return { ok: true, json: async () => ({ entries: [] }) };
    }
    return { ok: true, json: async () => ({}) };
  });
  global.fetch = mocks.fetchMock as typeof fetch;
}

describe("SCE-COLLAB-01C-R5 audience team options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCanonical();
  });

  it("R5-01/R5-02 contextual dialog loads canonical GET /api/teams array", async () => {
    render(
      <IntlWrapper>
        <ContextualClubEventParticipationAudienceDialog
          eventId="evt-gv"
          open
          onClose={vi.fn()}
        />
      </IntlWrapper>,
    );

    await waitFor(() => {
      expect(mocks.fetchMock).toHaveBeenCalledWith("/api/teams", expect.objectContaining({ cache: "no-store" }));
    });

    const select = await screen.findByTestId("club-event-audience-team-select");
    expect(select).toHaveTextContent("Junioren F2");
    expect(select).not.toHaveTextContent("Archived Team");
  });

  it("R5-01/R5-14 normal Teilnehmer editor uses the same team option source", async () => {
    render(
      <IntlWrapper>
        <ClubEventParticipationAudienceEditor eventId="evt-gv" />
      </IntlWrapper>,
    );

    const select = await screen.findByTestId("club-event-audience-team-select");
    await waitFor(() => expect(select).toHaveTextContent("Junioren F2"));
    expect(mocks.fetchMock).toHaveBeenCalledWith("/api/teams", expect.any(Object));
  });

  it("R5-03 zero-recipient team remains selectable (no roster gate on options)", async () => {
    render(
      <IntlWrapper>
        <ContextualClubEventParticipationAudienceDialog
          eventId="evt-gv"
          open
          onClose={vi.fn()}
        />
      </IntlWrapper>,
    );

    const select = await screen.findByTestId("club-event-audience-team-select");
    fireEvent.change(select, { target: { value: "team-f2" } });
    expect(select).toHaveValue("team-f2");
  });

  it("R5-07 team selection persists via participation-audience POST", async () => {
    const onClose = vi.fn();
    render(
      <IntlWrapper>
        <ContextualClubEventParticipationAudienceDialog
          eventId="evt-gv"
          open
          onClose={onClose}
        />
      </IntlWrapper>,
    );

    fireEvent.change(await screen.findByTestId("club-event-audience-team-select"), {
      target: { value: "team-f2" },
    });
    fireEvent.click(screen.getByTestId("contextual-club-event-audience-save"));

    await waitFor(() => {
      expect(mocks.fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/participation-audience"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("team-f2"),
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("R5-04 parseTeamsListApiResponse excludes inactive entries (tenant scope is API-side)", () => {
    const options = parseTeamsListApiResponse(CANONICAL_TEAMS_API);
    expect(options.map((o) => o.id)).toEqual(["team-f2", "team-other-tenant"]);
  });

  it("R5-15 empty API list shows understandable empty state", async () => {
    mocks.fetchMock.mockImplementation(async (input: RequestInfo) => {
      if (String(input).includes("/api/teams")) {
        return { ok: true, json: async () => [] };
      }
      if (String(input).includes("/participation-audience")) {
        return { ok: true, json: async () => ({ entries: [] }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(
      <IntlWrapper>
        <ClubEventParticipationAudienceEditor eventId="evt-gv" />
      </IntlWrapper>,
    );

    const select = await screen.findByTestId("club-event-audience-team-select");
    expect(select).toHaveTextContent("Keine Teams verfügbar");
    expect(select).toBeDisabled();
  });
});
