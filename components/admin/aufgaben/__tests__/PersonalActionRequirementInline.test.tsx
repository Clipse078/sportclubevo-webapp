/**
 * @vitest-environment jsdom
 */

import { vi } from "vitest";

vi.mock("@/app/(admin)/dashboard/aufgaben/personal-requirement-actions", () => ({
  acknowledgePersonalRequirementAction: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PersonalActionRequirementInline from "../PersonalActionRequirementInline";
import { acknowledgePersonalRequirementAction } from "@/app/(admin)/dashboard/aufgaben/personal-requirement-actions";

describe("AUFGABEN-06G3 — PersonalActionRequirementInline", () => {
  it("renders Bestätigen and submits canonical ack action", async () => {
    const user = userEvent.setup();
    render(
      <PersonalActionRequirementInline
        requirement={{
          personalActionId: "requirement:recip-1",
          requirementRecipientId: "recip-1",
          description: null,
          actingForOtherPerson: false,
        }}
      />,
    );

    await user.click(screen.getByTestId("personal-requirement-acknowledge"));
    expect(acknowledgePersonalRequirementAction).toHaveBeenCalledWith({
      personalActionId: "requirement:recip-1",
      requirementRecipientId: "recip-1",
    });
  });
});
