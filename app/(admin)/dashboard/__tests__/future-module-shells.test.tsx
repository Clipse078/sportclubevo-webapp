/**
 * @vitest-environment jsdom
 *
 * PLATFORM-UX-01 — final sidebar order, future module shells, separators.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MitgliederPage from "@/app/(admin)/dashboard/mitglieder/page";
import AufgabenPage from "@/app/(admin)/dashboard/aufgaben/page";
import HelfereinsaetzePage from "@/app/(admin)/dashboard/helfereinsaetze/page";
import TrainerStaffPage from "@/app/(admin)/dashboard/trainer-staff/page";
import FormulareFreigabenPage from "@/app/(admin)/dashboard/formulare-freigaben/page";
import VorfaelleDisziplinPage from "@/app/(admin)/dashboard/vorfaelle-disziplin/page";
import {
  MITGLIEDER_CAPABILITIES,
  AUFGABEN_CAPABILITIES,
  HELFEREINSAETZE_CAPABILITIES,
  TRAINER_STAFF_CAPABILITIES,
  FORMULARE_FREIGABEN_CAPABILITIES,
  VORFAELLE_DISZIPLIN_CAPABILITIES,
} from "@/lib/nav/future-modules";

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: vi.fn().mockResolvedValue({ user: { id: "test" } }),
}));

const FUTURE_MODULE_PAGES = [
  {
    name: "Mitglieder",
    Page: MitgliederPage,
    capabilities: MITGLIEDER_CAPABILITIES,
    href: "/dashboard/mitglieder",
  },
  {
    name: "Aufgaben",
    Page: AufgabenPage,
    capabilities: AUFGABEN_CAPABILITIES,
    href: "/dashboard/aufgaben",
  },
  {
    name: "Helfereinsätze",
    Page: HelfereinsaetzePage,
    capabilities: HELFEREINSAETZE_CAPABILITIES,
    href: "/dashboard/helfereinsaetze",
  },
  {
    name: "Trainer & Staff",
    Page: TrainerStaffPage,
    capabilities: TRAINER_STAFF_CAPABILITIES,
    href: "/dashboard/trainer-staff",
  },
  {
    name: "Formulare & Freigaben",
    Page: FormulareFreigabenPage,
    capabilities: FORMULARE_FREIGABEN_CAPABILITIES,
    href: "/dashboard/formulare-freigaben",
  },
  {
    name: "Vorfälle & Disziplin",
    Page: VorfaelleDisziplinPage,
    capabilities: VORFAELLE_DISZIPLIN_CAPABILITIES,
    href: "/dashboard/vorfaelle-disziplin",
  },
] as const;

describe("PLATFORM-UX-01 — future module shells", () => {
  for (const { name, Page, capabilities } of FUTURE_MODULE_PAGES) {
    describe(name, () => {
      it("renders module title as accessible heading", async () => {
        const jsx = await Page();
        render(jsx);
        expect(screen.getByRole("heading", { level: 1, name })).toBeInTheDocument();
      });

      it("shows In Vorbereitung status badge", async () => {
        const jsx = await Page();
        render(jsx);
        expect(screen.getAllByText("In Vorbereitung").length).toBeGreaterThan(0);
      });

      it("renders all capability cards without fake entity counts", async () => {
        const jsx = await Page();
        render(jsx);
        for (const capability of capabilities) {
          expect(screen.getByRole("heading", { level: 2, name: capability.title })).toBeInTheDocument();
          expect(screen.getByText(capability.description)).toBeInTheDocument();
        }
        expect(screen.queryByText(/\d+\s+(Mitglieder|Aufgaben|Vorfälle|Einsätze)/i)).toBeNull();
        expect(screen.queryByText(/Coming Soon/i)).toBeNull();
      });

      it("does not show fake operational data patterns", async () => {
        const jsx = await Page();
        render(jsx);
        expect(screen.queryByText(/Demnächst/i)).toBeNull();
        expect(screen.queryByRole("button", { name: /erstellen|anlegen|neu/i })).toBeNull();
      });
    });
  }

  it("Mitglieder clarifies distinction from Personen", async () => {
    const jsx = await MitgliederPage();
    render(jsx);
    expect(screen.getByText(/Personen bleibt die kanonische Stammdatenquelle/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Geplanter Mitgliedschafts-Lebenszyklus")).toBeInTheDocument();
  });
});
