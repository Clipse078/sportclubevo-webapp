// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ZielgruppeDefinitionEditor from "@/components/admin/communication/zielgruppen/ZielgruppeDefinitionEditor";
import CommunicationAudienceSelector from "@/components/admin/communication/audience/CommunicationAudienceSelector";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";
import { emptyCommunicationAudienceSelection } from "@/lib/communication/audience/communication-audience-selection";

vi.mock("@/app/(admin)/dashboard/communication/zielgruppen/actions", () => ({
  classifyZielgruppeBulkEmailsAction: vi.fn(),
  persistZielgruppeBulkExternalContactsAction: vi.fn(),
}));

vi.mock("@/components/admin/communication/audience/CommunicationAudienceSelector", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/components/admin/communication/audience/CommunicationAudienceSelector")
  >();
  return {
    ...actual,
    CommunicationAudienceDiscoverPanel: () => null,
  };
});

const ZIELGRUPPE_ADD_BUTTON_TEST_IDS = [
  "zielgruppe-add-include",
  "zielgruppe-add-external",
  "zielgruppe-add-exclusion",
] as const;

function assertSinglePlusAddButton(button: HTMLElement) {
  const label = button.textContent?.replace(/\s+/g, " ").trim() ?? "";
  expect(label).not.toMatch(/^\+/);
  expect(label).not.toMatch(/\+\s*\+/);
  expect(button.querySelectorAll("svg").length).toBe(1);
  expect(button.getAttribute("aria-label") ?? label).not.toMatch(/^\+/);
}

describe("Zielgruppen add buttons (SCE-ZIELGRUPPEN-02-UXR3R1 duplicate plus)", () => {
  it("renders exactly one Plus icon and no leading + in label text", () => {
    render(
      <ZielgruppeDefinitionEditor
        value={EMPTY_ZIELGRUPPE_EDITOR_DEFINITION}
        onChange={() => {}}
      />,
    );

    for (const testId of ZIELGRUPPE_ADD_BUTTON_TEST_IDS) {
      assertSinglePlusAddButton(screen.getByTestId(testId));
    }

    expect(screen.getByTestId("zielgruppe-add-include").textContent).toContain("Auswahl hinzufügen");
    expect(screen.getByTestId("zielgruppe-add-external").textContent).toContain(
      "Externen Kontakt hinzufügen",
    );
    expect(screen.getByTestId("zielgruppe-add-exclusion").textContent).toContain(
      "Ausschluss hinzufügen",
    );
  });
});

describe("CommunicationAudienceSelector single add trigger", () => {
  it("does not duplicate plus in Empfänger hinzufügen label", () => {
    render(
      <CommunicationAudienceSelector
        context="TARGET_GROUP_MANAGEMENT"
        value={emptyCommunicationAudienceSelection()}
        onChange={() => {}}
        singleAddTrigger
        features={{
          wholeOrganisation: false,
          orgUnits: true,
          teams: true,
          roles: true,
          targetGroups: false,
          persons: true,
          externalContacts: false,
        }}
      />,
    );

    const button = screen.getByTestId("communication-audience-add-trigger");
    assertSinglePlusAddButton(button);
    expect(button.textContent).toContain("Empfänger hinzufügen");
  });
});
