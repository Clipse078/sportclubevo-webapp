/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import deMessages from "@/messages/de.json";
import { PersonalQuickAccess } from "../PersonalQuickAccess";

function renderQuickAccess() {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <PersonalQuickAccess
        initialItems={[
          {
            key: "navigation.aufgaben",
            kind: "navigate",
            label: "Aufgaben",
            href: "/dashboard/aufgaben",
          },
          {
            key: "action.create-match",
            kind: "create",
            label: "Spiel",
            href: "/dashboard/events/matches/new",
          },
        ]}
        initialActiveKeys={["navigation.aufgaben", "action.create-match"]}
        customizeCatalog={[
          {
            key: "navigation.aufgaben",
            kind: "navigate",
            label: "Aufgaben",
            href: "/dashboard/aufgaben",
          },
          {
            key: "action.create-match",
            kind: "create",
            label: "Spiel",
            href: "/dashboard/events/matches/new",
          },
        ]}
        maxPins={8}
      />
    </NextIntlClientProvider>,
  );
}

describe("PersonalQuickAccess", () => {
  it("renders navigation and create shortcuts with keyboard-accessible customize control", () => {
    renderQuickAccess();

    expect(screen.getByTestId("personal-quick-access")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aufgaben" })).toHaveAttribute(
      "href",
      "/dashboard/aufgaben",
    );
    expect(screen.getByRole("link", { name: "Spiel" })).toHaveAttribute(
      "href",
      "/dashboard/events/matches/new",
    );

    const customize = screen.getByRole("button", { name: "Anpassen" });
    fireEvent.click(customize);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens customizer with move controls for reorder without pointer-only dependency", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            items: [],
            activeKeys: [],
          }),
        }),
      ) as unknown as typeof fetch,
    );

    renderQuickAccess();
    fireEvent.click(screen.getByRole("button", { name: "Anpassen" }));
    expect(screen.getAllByRole("button", { name: "Nach oben" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Nach unten" }).length).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });
});
