// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VereinsleitungMeetingsList from "@/components/admin/vereinsleitung/VereinsleitungMeetingsList";
import type { MeetingListItem } from "@/lib/meetings/queries";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children?: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function baseMeeting(overrides: Partial<MeetingListItem> = {}): MeetingListItem {
  return {
    id: "m1",
    slug: "vorstand-juni",
    title: "Vorstandssitzung Juni",
    description: null,
    meetingDate: new Date("2026-06-20T18:00:00.000Z"),
    location: "Clubhaus",
    attendeeCount: 8,
    plannedDurationMin: 90,
    status: "PLANNED",
    reviewStage: "DRAFT",
    requiresFourEyeReview: false,
    visibilityScope: "ORGANISATION",
    createdByUserId: "u1",
    visibleRoleRefs: [],
    visibleUserRefs: [],
    visibleTeamRefs: [],
    visibleOrgUnitRefs: [],
    visiblePersonRefs: [],
    visibleTargetGroupRefs: [],
    ...overrides,
  };
}

describe("VereinsleitungMeetingsList", () => {
  it("exposes one primary card link per meeting with open label and title", () => {
    render(<VereinsleitungMeetingsList meetings={[baseMeeting()]} canManage />);

    const card = screen.getByTestId("vereinsleitung-meeting-card-vorstand-juni");
    const link = within(card).getByTestId("vereinsleitung-meeting-card-link");
    expect(link).toHaveAttribute("href", "/vereinsleitung/meetings/vorstand-juni");
    expect(within(card).getByTestId("vereinsleitung-meeting-card-title")).toHaveTextContent(
      "Vorstandssitzung Juni",
    );
    expect(within(card).getByTestId("vereinsleitung-meeting-card-open-label")).toHaveTextContent(
      "Öffnen",
    );
  });

  it("keeps Bearbeiten as an independent edit link when permitted", () => {
    render(<VereinsleitungMeetingsList meetings={[baseMeeting()]} canManage />);

    const card = screen.getByTestId("vereinsleitung-meeting-card-vorstand-juni");
    const edit = within(card).getByTestId("vereinsleitung-meeting-card-edit");
    expect(edit).toHaveAttribute("href", "/vereinsleitung/meetings/vorstand-juni/edit");
    expect(edit.className).toContain("pointer-events-auto");
  });

  it("hides Bearbeiten when manage permission is absent", () => {
    render(<VereinsleitungMeetingsList meetings={[baseMeeting()]} canManage={false} />);
    const card = screen.getByTestId("vereinsleitung-meeting-card-vorstand-juni");
    expect(within(card).queryByTestId("vereinsleitung-meeting-card-edit")).toBeNull();
  });
});
