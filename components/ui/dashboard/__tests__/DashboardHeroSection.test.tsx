/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardHeroSection } from "@/components/ui/dashboard/DashboardHeroSection";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
  URL.createObjectURL = vi.fn(() => "blob:preview-url");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DashboardHeroSection", () => {
  it("loads storage availability on mount", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storageAvailable: true, imageUrl: null }),
    });

    render(
      <DashboardHeroSection greeting="Guten Abend" highlightName="Michael" />,
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/account/dashboard-hero-image"),
    );
  });

  it("shows upload and remove actions in the hero menu", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storageAvailable: true, imageUrl: null }),
    });

    render(
      <DashboardHeroSection
        greeting="Guten Abend"
        highlightName="Michael"
        initialBackgroundImageUrl="https://cdn.example/hero.jpg"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Titelbild ändern" }));

    expect(screen.getByRole("menuitem", { name: "Bild ersetzen" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Titelbild entfernen" })).toBeInTheDocument();
  });

  it("opens the file picker from the upload menu action", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storageAvailable: true, imageUrl: null }),
    });

    render(<DashboardHeroSection greeting="Guten Abend" highlightName="Michael" />);

    const input = screen.getByLabelText("Bild hochladen") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: "Titelbild ändern" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Bild hochladen" }));

    expect(clickSpy).toHaveBeenCalled();
  });

  it("uses a local preview when blob storage is unavailable", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storageAvailable: false, imageUrl: null }),
    });

    render(<DashboardHeroSection greeting="Guten Abend" highlightName="Michael" />);

    await waitFor(() =>
      expect(screen.getByText(/Speicher nicht konfiguriert/i)).toBeInTheDocument(),
    );

    const file = new File(["hero"], "hero.png", { type: "image/png" });
    const input = screen.getByLabelText("Bild hochladen") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText(/Titelbild-Vorschau gesetzt/i)).toBeInTheDocument(),
    );
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uploads through the API when storage is available", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ storageAvailable: true, imageUrl: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrl: "https://cdn.example/new-hero.jpg",
          persistencePending: true,
        }),
      });

    render(<DashboardHeroSection greeting="Guten Abend" highlightName="Michael" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const file = new File(["hero"], "hero.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Bild hochladen"), {
      target: { files: [file] },
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/account/dashboard-hero-image", {
        method: "POST",
        body: expect.any(FormData),
      }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/Dauerhafte Speicherung folgt nach Schema-Freigabe/i),
      ).toBeInTheDocument(),
    );
  });

  it("removes a local preview without calling DELETE", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storageAvailable: false, imageUrl: null }),
    });

    render(<DashboardHeroSection greeting="Guten Abend" highlightName="Michael" />);

    await waitFor(() =>
      expect(screen.getByText(/Speicher nicht konfiguriert/i)).toBeInTheDocument(),
    );

    const file = new File(["hero"], "hero.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Bild hochladen"), {
      target: { files: [file] },
    });

    await waitFor(() =>
      expect(screen.getByLabelText("Bild ersetzen")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Titelbild ändern" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Titelbild entfernen" }));

    await waitFor(() =>
      expect(screen.getByText("Titelbild entfernt.")).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-url");
  });
});
