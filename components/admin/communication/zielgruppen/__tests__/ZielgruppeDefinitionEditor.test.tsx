// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ZielgruppeDefinitionEditor from "@/components/admin/communication/zielgruppen/ZielgruppeDefinitionEditor";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";

vi.mock("@/app/(admin)/dashboard/communication/zielgruppen/actions", () => ({
  classifyZielgruppeBulkEmailsAction: vi.fn(),
  persistZielgruppeBulkExternalContactsAction: vi.fn(),
}));

vi.mock("@/components/admin/communication/audience/CommunicationAudienceSelector", () => ({
  default: () => <div data-testid="communication-audience-selector-stub" />,
  CommunicationAudienceDiscoverPanel: () => null,
}));

describe("ZielgruppeDefinitionEditor", () => {
  it("renders unified include, external recipients, and exclusion sections", () => {
    render(
      <ZielgruppeDefinitionEditor
        value={EMPTY_ZIELGRUPPE_EDITOR_DEFINITION}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText(/^Einschliessen$/i)).toBeInTheDocument();
    expect(screen.getByText(/Bestimme, wer zu dieser Zielgruppe gehört/i)).toBeInTheDocument();
    expect(screen.getByText(/Externe Empfänger/i)).toBeInTheDocument();
    expect(screen.queryByText(/Direkt hinzufügen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Automatisch einschliessen/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Ausschliessen/i)).toBeInTheDocument();
    expect(screen.getByText(/immer ausgeschlossen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ganze Organisation/i)).toBeInTheDocument();
    expect(screen.getByTestId("zielgruppe-composition-union")).toBeInTheDocument();
    expect(screen.getByTestId("zielgruppe-add-include")).toBeInTheDocument();
    expect(screen.getByTestId("zielgruppe-add-external")).toBeInTheDocument();
    expect(screen.getByTestId("zielgruppe-bulk-email-open")).toBeInTheDocument();
    expect(screen.queryByText(/Zusammenfassung/i)).not.toBeInTheDocument();
  });

  it("separates structural criteria from directly selected persons", () => {
    render(
      <ZielgruppeDefinitionEditor
        value={{
          ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION,
          orgUnitIds: ["ou-1"],
          includePersonIds: ["p-1"],
        }}
        onChange={() => {}}
        knownLabels={{
          orgUnits: { "ou-1": "Vereinsleitung" },
          teams: {},
          roles: {},
          persons: { "p-1": "Michael Duijster" },
        }}
      />,
    );

    expect(screen.getByTestId("zielgruppe-include-criteria")).toBeInTheDocument();
    expect(screen.getByTestId("zielgruppe-include-direct-persons")).toBeInTheDocument();
    expect(screen.getByText("Kriterien")).toBeInTheDocument();
    expect(screen.getByText("Direkt ausgewählt")).toBeInTheDocument();
    expect(screen.getByText("Vereinsleitung")).toBeInTheDocument();
    expect(screen.getByText("Michael Duijster")).toBeInTheDocument();
  });

  it("toggles whole organisation checkbox", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ZielgruppeDefinitionEditor
        value={EMPTY_ZIELGRUPPE_EDITOR_DEFINITION}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText(/Ganze Organisation/i));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ wholeOrganisation: true }),
    );
  });
});
