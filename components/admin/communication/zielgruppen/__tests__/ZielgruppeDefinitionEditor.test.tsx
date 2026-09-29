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
  it("renders premium builder sections and composition control", () => {
    render(
      <ZielgruppeDefinitionEditor
        value={EMPTY_ZIELGRUPPE_EDITOR_DEFINITION}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText(/Automatisch einschliessen/i)).toBeInTheDocument();
    expect(screen.getByText(/Direkt hinzufügen/i)).toBeInTheDocument();
    expect(screen.getByText(/Ausschliessen/i)).toBeInTheDocument();
    expect(screen.getByText(/Keine Ausschlüsse/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ganze Organisation/i)).toBeInTheDocument();
    expect(screen.getByTestId("zielgruppe-composition-union")).toBeInTheDocument();
    expect(screen.getByTestId("zielgruppe-add-condition")).toBeInTheDocument();
    expect(screen.getByTestId("communication-audience-selector-stub")).toBeInTheDocument();
    expect(screen.queryByText(/Zusammenfassung/i)).not.toBeInTheDocument();
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
