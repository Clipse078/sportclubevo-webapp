/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalProgrammeCanonicalAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow";
import { PersonalProgrammePreviewRow } from "@/components/ui/dashboard/PersonalProgrammePreviewRow";
import { resolveSceMeetingPresentationFromProgramme } from "@/lib/sporting-activity-presentation/canonical/adapters/meeting-programme";
import type { PersonalProgrammeItem } from "../personal-programme-types";
import {
  hasExplicitMeetingAllowlistMatch,
  resolveMeetingPersonalRole,
} from "../meeting-personal-relevance";
import type { PersonalContext } from "@/lib/dashboard/personal-context/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function personalContext(overrides: Partial<PersonalContext> = {}): PersonalContext {
  return {
    tenantId: "tenant-a",
    userId: "user-a",
    personId: "person-a",
    hasActiveTenantMembership: true,
    hasLinkedPerson: true,
    teams: [{ teamId: "team-1", teamName: "TEAM A", kinds: ["PLAYER"], assignmentFunctionKeys: [], teamSeasonIds: [] }],
    orgUnits: [{ orgUnitId: "org-1", orgUnitName: "Vorstand", sources: ["USER_MEMBERSHIP"], assignmentFunctionKeys: [] }],
    assignments: [],
    ...overrides,
  };
}

describe("SCE-DASH-UX-01 — meeting presentation normalization", () => {
  it("builds domain-qualified meeting canonical presentation", () => {
    const model = resolveSceMeetingPresentationFromProgramme({
      meetingId: "m-1",
      slug: "test-sitzung",
      title: "Test Sitzung",
      meetingDate: new Date("2026-11-15T17:00:00.000Z"),
      location: "Clubhaus",
      contextLabel: "Meeting · Teilnehmer",
      status: "scheduled",
      plannedDurationMin: 90,
    });

    expect(model.kind).toBe("MEETING");
    expect(model.resourceKey).toBe("meeting:m-1");
    expect(model.route.consumeHref).toBe("/vereinsleitung/meetings/test-sitzung");
    expect(model.meetingTitle).toBe("Test Sitzung");
    expect(model.schedule.endAt).not.toBeNull();
  });

  it("renders meeting inside programme shell on dashboard canonical row", () => {
    const model = resolveSceMeetingPresentationFromProgramme({
      meetingId: "m-1",
      slug: "test-sitzung",
      title: "Test Sitzung mit sehr langem Titel für Dashboard Programme Karten",
      meetingDate: new Date("2026-11-15T17:00:00.000Z"),
      location: "Sitzungszimmer Nord",
      contextLabel: "Meeting · Teilnehmer",
    });

    const item: PersonalProgrammeItem = {
      id: "meeting:m-1",
      sourceType: "MEETING",
      startsAt: new Date("2026-11-15T17:00:00.000Z"),
      title: model.meetingTitle,
      typeLabel: "Sitzung",
      deepLink: model.route.consumeHref!,
      ariaLabel: "Sitzung: Test Sitzung",
      canonicalPresentation: model,
    };

    render(
      <PersonalProgrammeCanonicalAgendaRow
        item={item}
        fmtCfg={{ locale: "de-CH", timezone: "Europe/Zurich" }}
      />,
    );

    expect(screen.getByTestId("personal-programme-canonical-agenda-row")).toBeInTheDocument();
    expect(screen.getByTestId("sce-meeting-title")).toHaveTextContent(/Test Sitzung/i);
    expect(screen.getByTestId("sce-meeting-list-row-time")).toBeInTheDocument();
    expect(screen.getByTestId("sce-meeting-list-row-location")).toHaveTextContent("Sitzungszimmer Nord");
  });

  it("uses canonical preview path for meetings with presentation", () => {
    const previewRow = readRelative("components/ui/dashboard/PersonalProgrammePreviewRow.tsx");
    expect(previewRow).not.toContain('item.sourceType === "MEETING"');
    expect(previewRow).toContain("!item.canonicalPresentation");
  });

  it("Mein Programm list uses unified preview row", () => {
    const liste = readRelative("components/admin/mein-programm/PersonalProgrammeListeView.tsx");
    expect(liste).toContain("PersonalProgrammePreviewRow");
    expect(liste).not.toContain("PersonalProgrammeCanonicalAgendaRow");
  });
});

describe("SCE-DASH-UX-01 — meeting personal relevance", () => {
  const meeting = {
    visibilityScope: "RESTRICTED",
    createdByUserId: "other",
    visibleRoleRefs: null,
    visibleUserRefs: ["user-a"],
    visibleTeamRefs: null,
    visibleOrgUnitRefs: null,
    visiblePersonRefs: null,
  };

  it("allows invited user via explicit allowlist", () => {
    expect(
      hasExplicitMeetingAllowlistMatch(meeting, personalContext(), ["team-1"]),
    ).toBe(true);
    expect(
      resolveMeetingPersonalRole(meeting, null, personalContext(), ["team-1"]),
    ).toBe("invited");
  });

  it("blocks organisation meetings without personal relationship", () => {
    expect(
      resolveMeetingPersonalRole(
        {
          id: "m-org",
          tenantId: "tenant-a",
          status: "PLANNED",
          createdByUserId: "other",
          visibilityScope: "ORGANISATION",
          visibleRoleRefs: null,
          visibleUserRefs: null,
          visibleTeamRefs: null,
          visibleOrgUnitRefs: null,
          visiblePersonRefs: null,
        },
        null,
        personalContext(),
        [],
      ),
    ).toBeNull();
  });
});

describe("SCE-DASH-UX-01 — programme title wrapping", () => {
  it("reference layout titles wrap instead of hard truncate", () => {
    const layout = readRelative(
      "lib/sporting-activity-presentation/canonical/activity-card-reference-layout.ts",
    );
    expect(layout).toContain("trainingReferenceTitleClass");
    expect(layout).toMatch(/trainingReferenceTitleClass[\s\S]*line-clamp-3 break-words/);
  });

  it("preview row delegates canonical meetings to programme shell", () => {
    const model = resolveSceMeetingPresentationFromProgramme({
      meetingId: "m-2",
      slug: "sitzung",
      title: "Test Sitzung",
      meetingDate: new Date("2026-11-15T17:00:00.000Z"),
    });
    const item: PersonalProgrammeItem = {
      id: "meeting:m-2",
      sourceType: "MEETING",
      startsAt: new Date(model.schedule.startAt),
      title: "Test Sitzung",
      typeLabel: "Sitzung",
      deepLink: "/vereinsleitung/meetings/sitzung",
      ariaLabel: "Sitzung",
      canonicalPresentation: model,
    };

    render(<PersonalProgrammePreviewRow item={item} timeLabel="18:00" />);
    expect(screen.getByTestId("sce-meeting-title")).toBeInTheDocument();
  });
});
