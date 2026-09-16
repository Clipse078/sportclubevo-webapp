/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProviderLinkPanel } from "../ProviderLinkPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("ProviderLinkPanel", () => {
  it("shows read-only mappings by default", () => {
    render(
      <ProviderLinkPanel
        resource="club"
        id="club-1"
        mappings={[
          {
            id: "m1",
            provider: "SFV",
            providerClubId: 3172,
            providerClubName: "US Olympia 1963 rot",
            providerIsActive: true,
            lastSyncedAt: "2026-09-16T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("US Olympia 1963 rot")).toBeInTheDocument();
    expect(screen.getByText(/Anbieter-ID 3172/)).toBeInTheDocument();
    expect(screen.queryByTestId("provider-link-edit-form")).not.toBeInTheDocument();
  });

  it("opens dark edit form on demand", () => {
    render(<ProviderLinkPanel resource="club" id="club-1" mappings={[]} />);

    fireEvent.click(screen.getByTestId("provider-link-edit-toggle"));
    const form = screen.getByTestId("provider-link-edit-form");
    expect(form).toBeInTheDocument();
    expect(form.querySelector(".fca-input")).toBeTruthy();
  });
});
