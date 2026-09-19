/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TournamentPublicationToggles, {
  type TournamentPublicationState,
} from "../TournamentPublicationToggles";

describe("TournamentPublicationToggles", () => {
  it("renders SCE switch toggles for all publication channels", () => {
    const onChange = vi.fn();
    render(
      <TournamentPublicationToggles
        value={{
          websiteVisible: true,
          infoboardVisible: false,
          homepageVisible: true,
          wochenplanVisible: false,
          teamPageVisible: true,
        }}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("switch", { name: "Website" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Infoboard" })).not.toBeChecked();
    expect(screen.getByText(/Das Turnier erscheint im öffentlichen Wochenplan\./)).toBeInTheDocument();

    expect(screen.getByTestId("tournament-publication-row-websiteVisible")).toBeInTheDocument();
    expect(screen.queryByTestId("tournament-publication-grid")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Wochenplan" }));
    expect(onChange).toHaveBeenCalledWith({ wochenplanVisible: true });
  });

  it("maps each toggle to the same canonical visibility field keys", () => {
    const onChange = vi.fn();
    render(
      <TournamentPublicationToggles
        value={{
          websiteVisible: false,
          infoboardVisible: false,
          homepageVisible: false,
          wochenplanVisible: false,
          teamPageVisible: false,
        }}
        onChange={onChange}
      />,
    );

    const cases: Array<{ label: string; key: keyof TournamentPublicationState }> = [
      { label: "Website", key: "websiteVisible" },
      { label: "Infoboard", key: "infoboardVisible" },
      { label: "Homepage", key: "homepageVisible" },
      { label: "Wochenplan", key: "wochenplanVisible" },
      { label: "Teamseite", key: "teamPageVisible" },
    ];

    for (const { label, key } of cases) {
      fireEvent.click(screen.getByRole("switch", { name: label }));
      expect(onChange).toHaveBeenCalledWith({ [key]: true });
    }
  });
});
