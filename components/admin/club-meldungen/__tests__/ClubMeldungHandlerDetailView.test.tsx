// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ClubMeldungHandlerDetailView from "@/components/admin/club-meldungen/ClubMeldungHandlerDetailView";

const baseProps = {
  tenantSlug: "fc-demo",
  meldungId: "mel-1",
  version: 2,
  canMutate: true,
  actorUserId: "user-handler",
  caseNumber: "M-2026-0042",
  subject: "Kaputte Beleuchtung am Platz",
  description: "Licht auf Feld 2 funktioniert nicht.",
  category: "DAMAGE_OR_PROBLEM" as const,
  status: "IN_PROGRESS" as const,
  locationHint: "Platz 2",
  urgent: false,
  resolutionSummary: null,
  waitReason: null,
  followUpAt: null,
  nextStep: "Techniker informieren",
  accountableUser: { id: "user-handler", firstName: "Alex", lastName: "Muster" },
  orgUnit: { id: "ou-1", name: "Infrastruktur" },
  reporterUser: { id: "user-reporter", firstName: "Sam", lastName: "Reporter" },
  createdAt: "2026-01-01T08:00:00.000Z",
  createdByUser: { id: "user-reporter", firstName: "Sam", lastName: "Reporter" },
  mentionsEnabled: false,
  duplicateOf: null,
  attachments: [],
  messages: [],
  history: [],
  assignOptions: {
    orgUnits: [
      { id: "ou-1", name: "Infrastruktur" },
      { id: "ou-2", name: "Facility" },
    ],
    members: [
      { id: "user-handler", firstName: "Alex", lastName: "Muster" },
      { id: "user-alt", firstName: "Bianca", lastName: "Team" },
    ],
  },
};

describe("ClubMeldungHandlerDetailView", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ meldung: { version: 3 } }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows report content before handler action controls", () => {
    const { container } = render(<ClubMeldungHandlerDetailView {...baseProps} />);
    const html = container.innerHTML;
    const reportIndex = html.indexOf("Licht auf Feld 2 funktioniert nicht.");
    const actionsIndex = html.indexOf("Status ändern");
    expect(reportIndex).toBeGreaterThan(-1);
    expect(actionsIndex).toBeGreaterThan(reportIndex);
    expect(screen.getByRole("heading", { level: 1, name: baseProps.subject })).toBeTruthy();
  });

  it("keeps separate drafts for reply modes", () => {
    render(<ClubMeldungHandlerDetailView {...baseProps} />);
    const internalDraft = screen.getByLabelText("Interner Kommentar verfassen");
    fireEvent.change(internalDraft, { target: { value: "interner Entwurf" } });
    fireEvent.click(screen.getByRole("button", { name: "Antwort an meldende Person" }));
    const publicDraft = screen.getByLabelText("Antwort an meldende Person verfassen");
    expect(publicDraft).toHaveValue("");
    fireEvent.change(publicDraft, { target: { value: "öffentlicher Entwurf" } });
    fireEvent.click(screen.getByRole("button", { name: "Interner Kommentar" }));
    expect(screen.getByLabelText("Interner Kommentar verfassen")).toHaveValue("interner Entwurf");
    fireEvent.click(screen.getByRole("button", { name: "Antwort an meldende Person" }));
    expect(screen.getByLabelText("Antwort an meldende Person verfassen")).toHaveValue(
      "öffentlicher Entwurf",
    );
  });

  it("shows Verantwortlich and Erstellt von in the sidebar", () => {
    render(<ClubMeldungHandlerDetailView {...baseProps} accountableUser={null} />);
    expect(screen.getByText("Noch nicht zugewiesen")).toBeTruthy();
    expect(screen.getByText("Erstellt von")).toBeTruthy();
    expect(screen.getByText("Sam Reporter")).toBeTruthy();
  });

  it("filters activity to comments only", () => {
    render(
      <ClubMeldungHandlerDetailView
        {...baseProps}
        messages={[
          {
            id: "msg-1",
            body: "Intern",
            audience: "INTERNAL_NOTE",
            createdAt: "2026-01-02T10:00:00.000Z",
            author: { firstName: "Alex", lastName: "Muster" },
          },
        ]}
        history={[
          {
            id: "hist-1",
            eventType: "STATUS_CHANGED",
            createdAt: "2026-01-02T09:30:00.000Z",
            actor: { firstName: "Alex", lastName: "Muster" },
            payloadJson: { to: "IN_PROGRESS" },
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Kommentare" }));
    expect(screen.getByText("Intern")).toBeTruthy();
    expect(screen.queryByText("Status: In Bearbeitung")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Aktivitäten" }));
    expect(screen.getByText("Status: In Bearbeitung")).toBeTruthy();
    expect(screen.queryByText("Intern")).toBeNull();
  });

  it("renders compact system rows and merges duplicate message audit entries", () => {
    render(
      <ClubMeldungHandlerDetailView
        {...baseProps}
        messages={[
          {
            id: "msg-1",
            body: "Wir prüfen das.",
            audience: "REPORTER_REPLY",
            createdAt: "2026-01-02T10:00:00.000Z",
            author: { firstName: "Alex", lastName: "Muster" },
          },
        ]}
        history={[
          {
            id: "hist-1",
            eventType: "STATUS_CHANGED",
            createdAt: "2026-01-02T09:30:00.000Z",
            actor: { firstName: "Alex", lastName: "Muster" },
            payloadJson: { to: "IN_PROGRESS" },
          },
          {
            id: "hist-2",
            eventType: "HANDLER_MESSAGE_TO_REPORTER",
            createdAt: "2026-01-02T10:00:01.000Z",
            actor: { firstName: "Alex", lastName: "Muster" },
            payloadJson: { messageId: "msg-1", audience: "REPORTER_REPLY" },
          },
        ]}
      />,
    );
    expect(screen.getByText("Wir prüfen das.")).toBeTruthy();
    expect(screen.getByText("Status: In Bearbeitung")).toBeTruthy();
    expect(
      within(screen.getByLabelText("Aktivität")).queryByText("Antwort an meldende Person"),
    ).toBeNull();
  });

  it("allows selecting another org unit and member in the assignment panel", () => {
    render(<ClubMeldungHandlerDetailView {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Zuständigkeit ändern" }));
    const orgSelect = screen.getByLabelText("Bereich");
    const memberSelect = screen.getByLabelText("Verantwortliche Person");
    fireEvent.change(orgSelect, { target: { value: "ou-2" } });
    fireEvent.change(memberSelect, { target: { value: "user-alt" } });
    fireEvent.click(screen.getByRole("button", { name: "Zuständigkeit speichern" }));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/assign"),
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"orgUnitId":"ou-2"'),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/assign"),
      expect.objectContaining({
        body: expect.stringContaining('"accountableUserId":"user-alt"'),
      }),
    );
  });

  it("shows stored resolution on completed cases", () => {
    render(
      <ClubMeldungHandlerDetailView
        {...baseProps}
        status="DONE"
        resolutionSummary="Lampe ersetzt, geprüft."
      />,
    );
    expect(screen.getByText("Lampe ersetzt, geprüft.")).toBeTruthy();
  });
});