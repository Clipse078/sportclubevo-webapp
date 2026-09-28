// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ZielgruppeDefinitionEditor from "@/components/admin/communication/zielgruppen/ZielgruppeDefinitionEditor";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";

vi.mock("@/app/(admin)/dashboard/communication/zielgruppen/actions", () => ({
  previewZielgruppeRecipientsAction: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      candidates: 3,
      excluded: 1,
      effective: 2,
      scopeNotice: null,
      recipients: [{ personId: "p-1", displayName: "Person One" }],
      hasMore: false,
    },
  }),
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
    expect(screen.getAllByText(/Mindestens eine Bedingung/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Zusammenfassung/i)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Alle Bedingungen/i })).toBeInTheDocument();
    expect(screen.getByText(/Wer gehört zu dieser Zielgruppe/i)).toBeInTheDocument();
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
