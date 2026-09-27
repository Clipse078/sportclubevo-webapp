// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Mail } from "lucide-react";
import { ModuleCapabilityCard } from "@/components/admin/future-modules/ModuleCapabilityCard";

describe("ModuleCapabilityCard navigation", () => {
  it("activates the CTA as a real anchor to the configured destination", async () => {
    const user = userEvent.setup();
    const onNativeNavigate = vi.fn((event: Event) => {
      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
    });

    render(
      <ModuleCapabilityCard
        title="Zielgruppen"
        description="Organisationsweite Zielgruppen definieren und verwalten."
        icon={Mail}
        status="Verfügbar"
        href="/dashboard/communication/zielgruppen"
        linkLabel="Zielgruppen verwalten"
      />,
    );

    const cta = screen.getByRole("link", { name: /Zielgruppen verwalten/i });
    expect(cta.tagName).toBe("A");
    expect(cta).toHaveAttribute("href", "/dashboard/communication/zielgruppen");
    cta.addEventListener("click", onNativeNavigate);

    await user.click(cta);

    expect(onNativeNavigate).toHaveBeenCalledTimes(1);
  });
});
