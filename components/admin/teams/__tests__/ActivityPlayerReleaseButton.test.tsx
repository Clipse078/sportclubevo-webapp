/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ActivityPlayerReleaseButton from "@/components/admin/teams/ActivityPlayerReleaseButton";
import { OPERATIONAL_ACTION_NEUTRAL_COMPACT_CLASS } from "@/components/ui/operational-action-button-classes";

vi.mock("@/components/admin/teams/PlayerReleaseEditorSheet", () => ({
  default: () => null,
}));

describe("ActivityPlayerReleaseButton", () => {
  it("uses neutral operational action styling (not status danger/success)", () => {
    render(
      <ActivityPlayerReleaseButton
        teamId="t1"
        teamSeasonId="ts1"
        personId="p1"
        personDisplayName="SCE Testspieler 06"
        canManage
        activityContext={{
          mode: "ACTIVITY",
          eventId: "m1",
          scopeLabel: "Spiel",
        }}
        testId="release-btn"
      />,
    );

    const btn = screen.getByTestId("release-btn");
    for (const token of OPERATIONAL_ACTION_NEUTRAL_COMPACT_CLASS.split(" ")) {
      if (token) expect(btn).toHaveClass(token);
    }
    expect(btn.className).not.toMatch(/sce-danger/);
    expect(btn.className).not.toMatch(/sce-success/);
    fireEvent.click(btn);
  });
});
