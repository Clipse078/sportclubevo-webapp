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

  class ResizeObserverMock {
    observe() {}
    disconnect() {}
    unobserve() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
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

  it("shows upload, adjust, and remove actions in the hero menu", async () => {
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
    expect(screen.getByRole("menuitem", { name: "Titelbild anpassen" })).toBeInTheDocument();
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

  it("uses a local preview when blob storage is unavailable and opens edit mode", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storageAvailable: false, imageUrl: null }),
    });

    render(<DashboardHeroSection greeting="Guten Abend" highlightName="Michael" />);

    await waitFor(() =>
      expect(screen.getByText(/noch nicht dauerhaft gespeichert/i)).toBeInTheDocument(),
    );

    const file = new File(["hero"], "hero.png", { type: "image/png" });
    const input = screen.getByLabelText("Bild hochladen") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByRole("toolbar", { name: "Titelbild anpassen" })).toBeInTheDocument(),
    );
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uploads through the API when storage is available and opens edit mode", async () => {
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
      expect(screen.getByRole("toolbar", { name: "Titelbild anpassen" })).toBeInTheDocument(),
    );
  });

  it("enters edit mode from Titelbild anpassen", async () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Titelbild anpassen" }));

    expect(screen.getByRole("toolbar", { name: "Titelbild anpassen" })).toBeInTheDocument();
    expect(screen.getByText(/Bild ziehen, um den Ausschnitt zu verschieben/i)).toBeInTheDocument();
  });

  it("cancels edit mode without changing saved image", async () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Titelbild anpassen" }));
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(screen.queryByRole("toolbar", { name: "Titelbild anpassen" })).not.toBeInTheDocument();
    expect(document.querySelector('img[src="https://cdn.example/hero.jpg"]')).toBeTruthy();
  });

  it("saves session state when storage is unavailable", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storageAvailable: false, imageUrl: null }),
    });

    render(<DashboardHeroSection greeting="Guten Abend" highlightName="Michael" />);

    await waitFor(() =>
      expect(screen.getByText(/noch nicht dauerhaft gespeichert/i)).toBeInTheDocument(),
    );

    const file = new File(["hero"], "hero.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Bild hochladen"), {
      target: { files: [file] },
    });

    await waitFor(() =>
      expect(screen.getByRole("toolbar", { name: "Titelbild anpassen" })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(screen.getByText(/für diese Sitzung gespeichert/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("toolbar", { name: "Titelbild anpassen" })).not.toBeInTheDocument();
  });

  it("reopens editor from accepted session state and cancel restores it", async () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Titelbild anpassen" }));

    const slider = screen.getByRole("slider", { name: "Zoom" }) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "1.4" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(screen.queryByRole("toolbar", { name: "Titelbild anpassen" })).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Titelbild ändern" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Titelbild anpassen" }));

    const reopenedSlider = screen.getByRole("slider", { name: "Zoom" }) as HTMLInputElement;
    expect(reopenedSlider.value).toBe("1.4");

    fireEvent.change(reopenedSlider, { target: { value: "1.8" } });
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    fireEvent.click(screen.getByRole("button", { name: "Titelbild ändern" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Titelbild anpassen" }));

    expect((screen.getByRole("slider", { name: "Zoom" }) as HTMLInputElement).value).toBe("1.4");
  });

  it("saves edit mode to session state", async () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Titelbild anpassen" }));
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(screen.getByText(/Titelbild-Position gespeichert/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("toolbar", { name: "Titelbild anpassen" })).not.toBeInTheDocument();
  });

  it("resets draft transform from the toolbar", async () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Titelbild anpassen" }));

    const slider = screen.getByRole("slider", { name: "Zoom" }) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "1.5" } });
    expect(slider.value).toBe("1.5");

    fireEvent.click(screen.getByRole("button", { name: "Zurücksetzen" }));
    expect(slider.value).toBe("1");
  });

  it("supports keyboard zoom via plus button", async () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Titelbild anpassen" }));

    const slider = screen.getByRole("slider", { name: "Zoom" }) as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "Vergrößern" }));
    expect(Number(slider.value)).toBeGreaterThan(1);
  });

  it("cancels edit mode on Escape", async () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Titelbild anpassen" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("toolbar", { name: "Titelbild anpassen" })).not.toBeInTheDocument();
  });

  it("removes a local preview without calling DELETE", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storageAvailable: false, imageUrl: null }),
    });

    render(<DashboardHeroSection greeting="Guten Abend" highlightName="Michael" />);

    await waitFor(() =>
      expect(screen.getByText(/noch nicht dauerhaft gespeichert/i)).toBeInTheDocument(),
    );

    const file = new File(["hero"], "hero.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Bild hochladen"), {
      target: { files: [file] },
    });

    await waitFor(() =>
      expect(screen.getByRole("toolbar", { name: "Titelbild anpassen" })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(screen.queryByRole("toolbar", { name: "Titelbild anpassen" })).not.toBeInTheDocument(),
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
