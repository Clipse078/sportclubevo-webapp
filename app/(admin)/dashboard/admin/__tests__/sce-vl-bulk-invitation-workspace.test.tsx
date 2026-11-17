/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VlBulkInvitationWorkspace from "@/components/admin/users/vl-onboarding/VlBulkInvitationWorkspace";

describe("VlBulkInvitationWorkspace", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/admin/vl-invitations/resolve")) {
          return new Response(
            JSON.stringify({
              validationRows: [],
              resolved: [
                {
                  email: "irem.uysal@fcallschwil.ch",
                  action: "NEW_INVITATION",
                  label: "Neu",
                  displayName: "Irem Uysal",
                },
              ],
              sendMode: "DRY_RUN",
              contributorRoleProvisioned: false,
              contributorRoleProvisioningNote: "Rolle fehlt",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/api/admin/vl-invitations/preview-email")) {
          return new Response(
            JSON.stringify({
              subject: "Einladung",
              html: "<p>Vorschau</p>",
              variant: "new_account",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/api/admin/vl-invitations/send")) {
          throw new Error("send endpoint must not be called in preview refresh flow");
        }
        return new Response("{}", { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing without invite permission", () => {
    const { container } = render(<VlBulkInvitationWorkspace canInvite={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("exposes inline workspace toggle", () => {
    render(<VlBulkInvitationWorkspace canInvite />);
    expect(screen.getByTestId("vl-bulk-invitation-workspace")).toBeInTheDocument();
    expect(screen.getByText("VL-Einladungen vorbereiten")).toBeInTheDocument();
  });

  it("labels primary action for preview refresh and never calls send", async () => {
  render(<VlBulkInvitationWorkspace canInvite />);
    const toggle = screen.getByTestId("vl-bulk-invitation-toggle");
    await userEvent.click(toggle);

    const refresh = await screen.findByTestId("vl-invitation-preview-refresh");
    expect(refresh).toHaveTextContent("Vorschau aktualisieren");

    const liveSend = screen.getByTestId("vl-invitation-live-send");
    expect(liveSend).toBeDisabled();
    expect(screen.getByTestId("vl-invitation-live-send-blocker")).toHaveTextContent(
      "nicht freigeschaltet",
    );

    fireEvent.click(refresh);

    await waitFor(() => {
      expect(screen.getByTestId("vl-invitation-action-note")).toHaveTextContent("Vorschau aktualisiert");
    });

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((u) => u.includes("/send"))).toBe(false);
  });
});