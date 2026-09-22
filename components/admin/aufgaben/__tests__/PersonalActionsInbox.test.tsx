/**
 * @vitest-environment jsdom
 */

import { vi } from "vitest";

vi.mock("@/app/(admin)/dashboard/aufgaben/personal-participation-actions", () => ({
  respondToPersonalParticipationAction: vi.fn(),
}));

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PersonalActionsInbox from "../PersonalActionsInbox";

describe("AUFGABEN-05-UI-A1 — PersonalActionsInbox", () => {
  it("S — shows range summary when total exceeds displayed rows", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: `pa-${i}`,
      sourceType: "ATTENDANCE_RESPONSE" as const,
      sourceLabel: "Teilnahme",
      title: `Action ${i}`,
      subtitle: null,
      metaLine: null,
      href: null,
      emphasis: "calm" as const,
      inlineParticipationReady: false,
      inlineRequirementReady: false,
    }));

    render(
      <PersonalActionsInbox
        items={items}
        locale="de-CH"
        timeZone="Europe/Zurich"
        showManagementScope={false}
        bereich="meine"
        filter="all"
        showSourceFilters={false}
        totalActionableCount={65}
      />,
    );

    expect(screen.getByTestId("personal-inbox-range-summary")).toHaveTextContent(
      "1–50 von 65",
    );
  });
});
