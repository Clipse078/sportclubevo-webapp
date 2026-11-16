/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { PersonalProgrammePreviewRow } from "@/components/ui/dashboard/PersonalProgrammePreviewRow";
import { loadMeetingProgrammeItems } from "../adapters/meeting-programme-adapter";
import {
  enrichPersonalProgrammeItemsTenantBranding,
} from "../tenant-programme-branding";
import type { PersonalContext } from "@/lib/dashboard/personal-context";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    meeting: { findMany: vi.fn() },
    orgUnit: { findMany: vi.fn().mockResolvedValue([]) },
    team: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/lib/meetings/queries", () => ({
  canSeeMeeting: vi.fn(() => true),
}));

import { prisma } from "@/lib/db/prisma";

const TENANT_BRANDING = {
  displayName: "FC Allschwil",
  logoUrl: "https://cdn.example/fca.png",
};

function buildContext(): PersonalContext {
  return {
    tenantId: "tenant-a",
    userId: "user-a",
    personId: "person-a",
    hasLinkedPerson: true,
    hasActiveTenantMembership: true,
    teams: [],
    orgUnits: [],
    assignments: [],
  };
}

const meetingRow = {
  id: "meet-1",
  tenantId: "tenant-a",
  slug: "vorstand",
  title: "Vorstandssitzung",
  meetingDate: new Date("2026-11-17T18:00:00.000Z"),
  location: null,
  status: "PLANNED",
  visibilityScope: "ORGANISATION",
  createdByUserId: "user-a",
  visibleRoleRefs: null,
  visibleUserRefs: null,
  visibleTeamRefs: null,
  visibleOrgUnitRefs: null,
  visiblePersonRefs: null,
  visibleTargetGroupRefs: null,
  plannedDurationMin: 60,
};

describe("dashboard meeting preview branding — adapter to render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.meeting.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([meetingRow] as never)
      .mockResolvedValueOnce([]);
  });

  it("renders tenant club crest and canonical uppercase club name", async () => {
    const items = await loadMeetingProgrammeItems({
      personal: buildContext(),
      permissionKeys: [PERMISSIONS.MEETINGS_VIEW],
      timeZone: "Europe/Zurich",
      rangeStart: new Date("2026-11-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-11-30T23:59:59.999Z"),
      tenantBranding: TENANT_BRANDING,
    });

    const [enriched] = enrichPersonalProgrammeItemsTenantBranding(items, TENANT_BRANDING);
    render(
      <PersonalProgrammePreviewRow
        item={enriched}
        timeLabel="18:00"
        dashboardCockpitPreview
      />,
    );

    const identity = screen.getByTestId("sce-meeting-context");
    expect(within(identity).getByText("FC Allschwil")).toBeInTheDocument();
    expect(screen.getByTestId("club-crest-image")).toHaveAttribute("src", TENANT_BRANDING.logoUrl);
    expect(
      identity.querySelector("[data-sce-programme-dashboard-preview-club-name][data-sce-team-name]"),
    ).toBeTruthy();
    expect(within(identity).queryByText(/Meeting · Organisator/i)).toBeNull();
  });
});