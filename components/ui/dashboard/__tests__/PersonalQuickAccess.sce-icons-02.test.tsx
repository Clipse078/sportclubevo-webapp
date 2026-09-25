/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import deMessages from "@/messages/de.json";
import { PersonalQuickAccess } from "../PersonalQuickAccess";

describe("PersonalQuickAccess SCE-ICONS-02", () => {
  it("renders approved SCE icons only for mapped navigation shortcuts", () => {
    render(
      <NextIntlClientProvider locale="de" messages={deMessages}>
        <PersonalQuickAccess
          initialItems={[
            {
              key: "navigation.trainingcenter",
              kind: "navigate",
              label: "Trainings",
              href: "/dashboard/training",
            },
            {
              key: "navigation.aufgaben",
              kind: "navigate",
              label: "Aufgaben",
              href: "/dashboard/aufgaben",
            },
          ]}
          initialActiveKeys={["navigation.trainingcenter", "navigation.aufgaben"]}
          customizeCatalog={[]}
          maxPins={8}
        />
      </NextIntlClientProvider>,
    );

    const trainingLink = screen.getByRole("link", { name: "Trainings" });
    expect(
      trainingLink.querySelector('[data-sce-nav-destination-icon="training"]'),
    ).toBeTruthy();

    const aufgabenLink = screen.getByRole("link", { name: "Aufgaben" });
    expect(
      aufgabenLink.querySelector("[data-sce-nav-destination-icon]"),
    ).toBeNull();
  });
});
