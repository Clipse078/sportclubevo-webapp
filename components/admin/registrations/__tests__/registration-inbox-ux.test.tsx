/**
 * @vitest-environment jsdom
 *
 * R9 — Registrierungen operational inbox UX (presentation + filter contracts).
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RegistrationInbox from "@/components/admin/registrations/RegistrationInbox";
import type { RegistrationListItem } from "@/lib/registrations/queries";

vi.mock("@/components/admin/registrations/RegistrationDetailDrawer", () => ({
  default: ({ registration, onClose }: { registration: RegistrationListItem; onClose: () => void }) => (
    <div data-testid="registration-drawer">
      <span>{registration.firstName}</span>
      <button type="button" onClick={onClose}>
        Schließen
      </button>
    </div>
  ),
}));

function mockRegistration(partial: Partial<RegistrationListItem> & Pick<RegistrationListItem, "id" | "firstName" | "lastName" | "email" | "status" | "type">): RegistrationListItem {
  return {
    submittedAt: new Date("2026-10-01T10:00:00.000Z"),
    updatedAt: new Date("2026-10-01T10:00:00.000Z"),
    payloadJson: {},
    personId: null,
    assignedToUserId: null,
    assignedToUser: null,
    targetGroup: null,
    duplicateIgnoredAt: null,
    tenant: { id: "t1", name: "FC Test", key: "fc-test" },
    ...partial,
  } as RegistrationListItem;
}

const FIXTURES: RegistrationListItem[] = [
  mockRegistration({
    id: "r-new",
    firstName: "Anna",
    lastName: "Neu",
    email: "anna@example.com",
    status: "NEW",
    type: "SPIELERANMELDUNG",
  }),
  mockRegistration({
    id: "r-assign",
    firstName: "Ben",
    lastName: "Zuweisen",
    email: "ben@example.com",
    status: "REVIEWING",
    type: "PROBETRAINING",
  }),
  mockRegistration({
    id: "r-dup",
    firstName: "Clara",
    lastName: "Duplikat",
    email: "clara@example.com",
    status: "NEW",
    type: "SPIELERANMELDUNG",
    payloadJson: { possibleDuplicate: true },
  }),
];

describe("RegistrationInbox R9 UX", () => {
  it("renders KPI summary counts and registration rows", () => {
    render(
      <RegistrationInbox
        tenantSlug="fc-test"
        initialRegistrations={FIXTURES}
        canEdit
        locale="de-CH"
        timezone="Europe/Zurich"
      />,
    );

    expect(screen.getByRole("heading", { name: "Registrierungen" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Operative Kennzahlen" })).toBeTruthy();
    expect(screen.getByText("Anna Neu")).toBeTruthy();
    expect(screen.getByText("Ben Zuweisen")).toBeTruthy();
  });

  it("filters rows when Neu KPI is toggled", () => {
    render(
      <RegistrationInbox tenantSlug="fc-test" initialRegistrations={FIXTURES} canEdit />,
    );

    const kpiGroup = screen.getByRole("group", { name: "Operative Kennzahlen" });
    fireEvent.click(within(kpiGroup).getByRole("button", { name: /Neu/i }));

    expect(screen.getByText("Anna Neu")).toBeTruthy();
    expect(screen.getByText("Clara Duplikat")).toBeTruthy();
    expect(screen.queryByText("Ben Zuweisen")).toBeNull();
  });

  it("filters by search query", () => {
    render(
      <RegistrationInbox tenantSlug="fc-test" initialRegistrations={FIXTURES} canEdit />,
    );

    fireEvent.change(screen.getByLabelText("Suche Anmeldungen"), {
      target: { value: "Ben" },
    });

    expect(screen.getByText("Ben Zuweisen")).toBeTruthy();
    expect(screen.queryByText("Anna Neu")).toBeNull();
  });

  it("opens and closes the detail drawer", () => {
    render(
      <RegistrationInbox tenantSlug="fc-test" initialRegistrations={FIXTURES} canEdit />,
    );

    fireEvent.click(screen.getByText("Anna Neu"));
    expect(screen.getByTestId("registration-drawer")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));
    expect(screen.queryByTestId("registration-drawer")).toBeNull();
  });

  it("shows filtered-empty guidance", () => {
    render(
      <RegistrationInbox tenantSlug="fc-test" initialRegistrations={FIXTURES} canEdit />,
    );

    fireEvent.change(screen.getByLabelText("Suche Anmeldungen"), {
      target: { value: "unbekannt-xyz" },
    });

    expect(screen.getByText("Keine Treffer")).toBeTruthy();
    expect(screen.getByText(/Suchbegriff anpassen oder Filter zurücksetzen/)).toBeTruthy();
  });
});
