// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ZielgruppeDefinitionEditor from "@/components/admin/communication/zielgruppen/ZielgruppeDefinitionEditor";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";

vi.mock("@/app/(admin)/dashboard/communication/zielgruppen/actions", () => ({
  searchZielgruppeOrgUnitsAction: vi.fn(),
  searchZielgruppeTeamsAction: vi.fn(),
  searchZielgruppeRolesAction: vi.fn(),
  searchZielgruppePersonsAction: vi.fn(),
}));

describe("ZielgruppeDefinitionEditor", () => {
  it("renders whole-organisation control and union semantics hint", () => {
    render(
      <ZielgruppeDefinitionEditor
        value={EMPTY_ZIELGRUPPE_EDITOR_DEFINITION}
        onChange={() => {}}
      />,
    );

    expect(screen.getByLabelText(/Ganze Organisation/i)).toBeInTheDocument();
    expect(screen.getByText(/Vereinigung \(ODER\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Empfänger \(geplant\)/i)).toBeInTheDocument();
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
