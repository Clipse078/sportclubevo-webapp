/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ClubMeldungReporterForm from "@/components/admin/club-meldungen/ClubMeldungReporterForm";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("ClubMeldungReporterForm", () => {
  beforeEach(() => {
    sessionStorage.clear();
    push.mockReset();
    refresh.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/meldungen/attachments")) {
          return new Response(
            JSON.stringify({
              attachment: {
                attachmentId: "att-1",
                filename: "proof.jpg",
                contentType: "image/jpeg",
                size: 10,
              },
            }),
            { status: 201 },
          );
        }
        if (url.endsWith("/meldungen")) {
          return new Response(
            JSON.stringify({ meldung: { id: "meldung-1" }, created: true }),
            { status: 201 },
          );
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retains draft fields in sessionStorage", async () => {
    render(<ClubMeldungReporterForm tenantSlug="fc-demo" />);
    fireEvent.change(screen.getByLabelText("Betreff"), { target: { value: "Heizung" } });
    fireEvent.change(screen.getByLabelText("Beschreibung"), { target: { value: "Kalt" } });
    await waitFor(() => {
      const raw = sessionStorage.getItem("meldung-draft-fc-demo");
      expect(raw).toBeTruthy();
      expect(raw).toContain("Heizung");
    });
  });

  it("blocks submit while attachment upload is in progress", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise(() => {
            /* never resolves */
          }),
      ) as typeof fetch,
    );
    render(<ClubMeldungReporterForm tenantSlug="fc-demo" />);
    fireEvent.change(screen.getByLabelText("Betreff"), { target: { value: "Foto" } });
    fireEvent.change(screen.getByLabelText("Beschreibung"), { target: { value: "Test" } });
    const fileInput = screen.getByLabelText("Dateien auswählen");
    const file = new File(["x"], "proof.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Anliegen melden" })).toBeDisabled();
    });
  });
});