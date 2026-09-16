/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TournamentPublicationToggles from "../TournamentPublicationToggles";

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

    expect(screen.getByRole("switch", { name: "Öffentliche Turnierseite" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Infoboard" })).not.toBeChecked();
    expect(screen.getByText("Im öffentlichen Wochenplan anzeigen.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Wochenplan" }));
    expect(onChange).toHaveBeenCalledWith({ wochenplanVisible: true });
  });
});
