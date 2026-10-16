/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import deMessages from "@/messages/de.json";
import { PersonalQuickAccess } from "../PersonalQuickAccess";

function renderQuickAccess(createMenu?: React.ReactNode) {
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
        ]}
        initialActiveKeys={["navigation.aufgaben"]}
        customizeCatalog={[
          {
            key: "navigation.aufgaben",
            kind: "navigate",
            label: "Aufgaben",
            href: "/dashboard/aufgaben",
          },
        ]}
        maxPins={8}
        createMenu={createMenu}
      />
    </NextIntlClientProvider>,
  );
}

describe("PersonalQuickAccess", () => {
  it("renders navigation shortcuts and optional canonical create menu slot", () => {
    renderQuickAccess(
      <button type="button" aria-label="Erstellen">
        Erstellen
      </button>,
    );

    expect(screen.getByTestId("personal-quick-access")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aufgaben" })).toHaveAttribute(
      "href",
      "/dashboard/aufgaben",
    );
    expect(screen.getByTestId("personal-quick-access-create")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Erstellen" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Spiel planen/i })).not.toBeInTheDocument();
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
