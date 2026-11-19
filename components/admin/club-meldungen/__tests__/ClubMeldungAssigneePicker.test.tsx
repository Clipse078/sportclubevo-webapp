// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClubMeldungAssigneePicker } from "@/components/admin/club-meldungen/ClubMeldungAssigneePicker";

const members = [
  { id: "user-handler", firstName: "Alex", lastName: "Muster", canOperateCase: true },
  { id: "user-alt", firstName: "Bianca", lastName: "Team", canOperateCase: true },
  {
    id: "user-plain",
    firstName: "Chris",
    lastName: "OhneRecht",
    canOperateCase: false,
  },
];

describe("ClubMeldungAssigneePicker", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens with empty search and initial eligible members", async () => {
    const onSelect = vi.fn();
    render(
      <ClubMeldungAssigneePicker
        members={members}
        selectedUserId="user-handler"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Verantwortliche Person ändern" }));

    expect(screen.getByLabelText("Verantwortliche Person suchen")).toHaveValue("");
    expect(screen.getByTestId("meldung-assignee-current")).toHaveTextContent("Alex Muster");

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Bianca Team/i })).toBeTruthy();
    });
    expect(screen.getByRole("option", { name: /Chris OhneRecht/i })).toBeTruthy();
    expect(screen.getByText("Keine Meldungs-Bearbeitungsberechtigung")).toBeTruthy();
  });

  it("filters by name and selects another person", async () => {
    const onSelect = vi.fn();
    render(
      <ClubMeldungAssigneePicker
        members={members}
        selectedUserId="user-handler"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Verantwortliche Person ändern" }));
    const input = screen.getByLabelText("Verantwortliche Person suchen");
    fireEvent.change(input, { target: { value: "Bian" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Bianca Team/i })).toBeTruthy();
    });
    expect(screen.queryByRole("option", { name: /Chris OhneRecht/i })).toBeNull();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("user-alt");
  });

  it("restores initial results after clearing search without unassigning", async () => {
    const onSelect = vi.fn();
    render(
      <ClubMeldungAssigneePicker members={members} selectedUserId="user-handler" onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Verantwortliche Person ändern" }));
    const input = screen.getByLabelText("Verantwortliche Person suchen");
    fireEvent.change(input, { target: { value: "Bian" } });
    fireEvent.change(input, { target: { value: "" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Chris OhneRecht/i })).toBeTruthy();
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("unassigns only via explicit remove control", () => {
    const onSelect = vi.fn();
    render(
      <ClubMeldungAssigneePicker members={members} selectedUserId="user-handler" onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Verantwortliche Person ändern" }));
    fireEvent.click(screen.getByRole("button", { name: "Zuweisung entfernen" }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("supports keyboard highlight and pointer selection", async () => {
    const onSelect = vi.fn();
    render(<ClubMeldungAssigneePicker members={members} selectedUserId={null} onSelect={onSelect} />);

    const input = screen.getByLabelText("Verantwortliche Person suchen");
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Alex Muster/i })).toBeTruthy();
    });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("user-alt");
  });
});