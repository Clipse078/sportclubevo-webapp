/**
 * @vitest-environment jsdom
 */

import type { ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "@/messages/de.json";
import TournamentPublicationToggles, {
  type TournamentPublicationState,
} from "../TournamentPublicationToggles";

function renderToggles(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("TournamentPublicationToggles", () => {
  it("renders SCE switch toggles for all publication channels", () => {
    const onChange = vi.fn();
    renderToggles(
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

    fireEvent.click(screen.getByRole("switch", { name: "Wochenplan" }));
    expect(onChange).toHaveBeenCalledWith({ wochenplanVisible: true });
  });

  it("maps each toggle to the same canonical visibility field keys", () => {
    const onChange = vi.fn();
    renderToggles(
      <TournamentPublicationToggles
        value={{
          websiteVisible: true,
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
      onChange.mockClear();
      const toggle = screen.getByRole("switch", { name: label });
      const next = toggle.getAttribute("aria-checked") !== "true";
      fireEvent.click(toggle);
      expect(onChange).toHaveBeenCalledWith({ [key]: next });
    }
  });
});
