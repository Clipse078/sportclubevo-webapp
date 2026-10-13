/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import deMessages from "@/messages/de.json";
import VeranstaltungCreateForm from "@/components/admin/veranstaltungen/VeranstaltungCreateForm";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";

const defaultCreateGovernance: SceActivityEffectiveGovernance = {
  activityType: "CLUB_EVENT",
  personId: "person-test",
  mayCreate: true,
  publicationAuthority: "DIRECT_PUBLISH",
  approvalStrategy: "ANY_ONE",
  validatorPersonIds: [],
};
import VeranstaltungEditForm from "@/components/admin/veranstaltungen/VeranstaltungEditForm";
import { VeranstaltungEditSubmitProvider } from "@/components/admin/veranstaltungen/VeranstaltungEditSubmitContext";
import VeranstaltungAusspielungFields from "@/components/admin/veranstaltungen/VeranstaltungAusspielungFields";

let mockSearchParams = "";
const routerPush = vi.fn((href: string) => {
  const query = href.includes("?") ? href.split("?")[1] : "";
  mockSearchParams = query;
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, refresh: vi.fn() }),
  usePathname: () => "/dashboard/veranstaltungen/new",
  useSearchParams: () => new URLSearchParams(mockSearchParams),
}));

vi.mock("@/lib/collaboration/client/use-collaboration-mutation", () => ({
  useCollaborationMutation: () => ({
    attachCycleBaseline: (body: Record<string, unknown>) => ({
      payload: body,
      cycleRequested: false,
    }),
    applyMutationCollaboration: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: { success: vi.fn(), danger: vi.fn(), warning: vi.fn(), info: vi.fn(), neutral: vi.fn() },
  }),
}));

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("VeranstaltungAusspielungFields — SCE-EVENTS-01B2", () => {
  it("renders Website, Homepage, and Wochenplan as switches without Infoboard", () => {
    renderWithIntl(
      <VeranstaltungAusspielungFields
        values={{ websiteVisible: true, homepageVisible: false, wochenplanVisible: true }}
        onChange={vi.fn()}
      />,
    );

    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
    expect(screen.queryByRole("switch", { name: /Infoboard/i })).toBeNull();
    expect(screen.getByRole("switch", { name: "Website" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Homepage" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("switch", { name: "Wochenplan" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("disables Homepage when Website is OFF but preserves homepage preference in state", () => {
    const onChange = vi.fn();
    renderWithIntl(
      <VeranstaltungAusspielungFields
        values={{ websiteVisible: false, homepageVisible: true, wochenplanVisible: false }}
        onChange={onChange}
      />,
    );

    const homepage = screen.getByRole("switch", { name: "Homepage" });
    expect(homepage).toBeDisabled();
    expect(homepage).toHaveAttribute("aria-checked", "true");
  });

  it("supports keyboard toggling on Website switch", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(
      <VeranstaltungAusspielungFields
        values={{ websiteVisible: true, homepageVisible: false, wochenplanVisible: false }}
        onChange={onChange}
      />,
    );

    const website = screen.getByRole("switch", { name: "Website" });
    website.focus();
    await user.keyboard("[Space]");
    expect(onChange).toHaveBeenCalledWith({ websiteVisible: false });
  });

  it("create form posts manual Ausspielung fields only (no infoboardVisible)", () => {
    const formSource = readFileSync(
      join(process.cwd(), "components/admin/veranstaltungen/VeranstaltungCreateForm.tsx"),
      "utf8",
    );
    expect(formSource).toContain("VeranstaltungAusspielungFields");
    expect(formSource).toContain("ausspielung");
    expect(formSource).not.toContain("infoboardVisible");
    expect(formSource).toContain("/api/club-events/composer/commit");
    expect(formSource).toMatch(/buildPayload\(\)[\s\S]*ausspielung/);
  });

  it("toggling Ganztägig does not reset Ausspielung switches", async () => {
    mockSearchParams = "";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
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

    renderWithIntl(
      <VeranstaltungCreateForm
        pitchHallFacilityGroups={[]}
        dressingRoomFacilityGroups={[]}
        effectiveGovernance={defaultCreateGovernance}
      />,
    );
    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("switch", { name: "Wochenplan", hidden: true }));
    expect(screen.getByRole("switch", { name: "Wochenplan", hidden: true })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(screen.getByRole("switch", { name: "Ganztägig", hidden: true }));
    expect(screen.getByRole("switch", { name: "Ganztägig", hidden: true })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    expect(screen.getByRole("switch", { name: "Wochenplan", hidden: true })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("edit form loads persisted Ausspielung values", () => {
    mockSearchParams = "tab=mehr";
    renderWithIntl(
      <VeranstaltungEditSubmitProvider>
        <VeranstaltungEditForm
          timeZone="Europe/Zurich"
          event={{
            id: "evt-1",
            title: "Fest",
            description: null,
            location: null,
            startAt: "2026-09-25T16:00:00.000Z",
            endAt: "2026-09-25T18:00:00.000Z",
            allDay: false,
            organizerName: null,
            remarks: null,
            status: "SCHEDULED",
            source: "MANUAL",
            websiteVisible: false,
            infoboardVisible: true,
            homepageVisible: true,
            wochenplanVisible: true,
            trainingsplanVisible: false,
            teamPageVisible: false,
            season: { id: "season-1", key: "2026-27", name: "2026/27" },
            organisationalAudience: { scope: "CLUB_WIDE", teamIds: [], orgUnitIds: [], targets: [] },
          }}
        />
      </VeranstaltungEditSubmitProvider>,
    );

    expect(screen.getByRole("switch", { name: "Website" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: "Homepage" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Wochenplan" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
