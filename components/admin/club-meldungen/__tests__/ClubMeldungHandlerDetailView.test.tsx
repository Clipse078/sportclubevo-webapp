// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  reporterUser: { firstName: "Sam", lastName: "Reporter" },
  duplicateOf: null,
  attachments: [],
  messages: [],
  history: [],
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
    fireEvent.click(screen.getByRole("button", { name: "Interne Notiz" }));
    const textarea = screen.getByLabelText("Interne Notiz verfassen");
    fireEvent.change(textarea, { target: { value: "interner Entwurf" } });
    fireEvent.click(screen.getByRole("button", { name: "Antwort an meldende Person" }));
    const publicDraft = screen.getByLabelText("Antwort an meldende Person verfassen");
    expect(publicDraft).toHaveValue("");
    fireEvent.change(publicDraft, { target: { value: "öffentlicher Entwurf" } });
    fireEvent.click(screen.getByRole("button", { name: "Interne Notiz" }));
    expect(screen.getByLabelText("Interne Notiz verfassen")).toHaveValue("interner Entwurf");
    fireEvent.click(screen.getByRole("button", { name: "Antwort an meldende Person" }));
    expect(screen.getByLabelText("Antwort an meldende Person verfassen")).toHaveValue(
      "öffentlicher Entwurf",
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