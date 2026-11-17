/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import VlBulkInvitationWorkspace from "@/components/admin/users/vl-onboarding/VlBulkInvitationWorkspace";

describe("VlBulkInvitationWorkspace", () => {
  it("renders nothing without invite permission", () => {
    const { container } = render(<VlBulkInvitationWorkspace canInvite={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("exposes inline workspace toggle", () => {
    render(<VlBulkInvitationWorkspace canInvite />);
    expect(screen.getByTestId("vl-bulk-invitation-workspace")).toBeInTheDocument();
    expect(screen.getByText("VL-Einladungen vorbereiten")).toBeInTheDocument();
  });
});