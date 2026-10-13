/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ClubEventFreigabenUnauthorizedState from "@/components/admin/veranstaltungen/ClubEventFreigabenUnauthorizedState";

describe("ClubEventFreigabenUnauthorizedState", () => {
  it("shows role-aware copy for governance admin outside validator pool", () => {
    render(
      <ClubEventFreigabenUnauthorizedState
        reason="NOT_IN_VALIDATOR_POOL"
        display="GOVERNANCE_ADMIN_NON_VALIDATOR"
      />,
    );

    expect(screen.getByRole("link", { name: "Freigaben verwalten" })).toBeInTheDocument();
  });

  it("shows governance manage action when admin lacks approve permission", () => {
    render(
      <ClubEventFreigabenUnauthorizedState
        reason="MISSING_APPROVE_PERMISSION"
        display="GOVERNANCE_ADMIN_NON_VALIDATOR"
      />,
    );

    expect(screen.getByText("Keine Freigabeberechtigung")).toBeInTheDocument();
    expect(
      screen.getByText(/nicht als freigabeberechtigte Person für Veranstaltungen hinterlegt/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Freigaben verwalten" })).toHaveAttribute(
      "href",
      "/dashboard/admin/people-access",
    );
    expect(screen.queryByText(/activities\.club_event\.approve/)).not.toBeInTheDocument();
  });

  it("shows standard contact-admin copy for ordinary unauthorized users", () => {
    render(
      <ClubEventFreigabenUnauthorizedState
        reason="MISSING_APPROVE_PERMISSION"
        display="STANDARD"
      />,
    );

    expect(screen.getByText("Kein Zugriff auf Veranstaltungs-Freigaben")).toBeInTheDocument();
    expect(screen.getByText(/Club-Administration/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Freigaben verwalten" })).not.toBeInTheDocument();
  });
});
