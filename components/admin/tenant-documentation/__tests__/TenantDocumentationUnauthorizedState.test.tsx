/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TenantDocumentationUnauthorizedState } from "../TenantDocumentationUnauthorizedState";

describe("TenantDocumentationUnauthorizedState", () => {
  it("shows forbidden copy without page titles", () => {
    render(<TenantDocumentationUnauthorizedState reason="forbidden" />);
    expect(screen.getByTestId("tenant-documentation-unauthorized")).toHaveAttribute(
      "data-reason",
      "forbidden",
    );
    expect(screen.getByText("Kein Zugriff auf Dokumentation")).toBeInTheDocument();
    expect(screen.queryByText(/Sitzung/)).not.toBeInTheDocument();
  });

  it("shows tenant context copy for missing active tenant", () => {
    render(<TenantDocumentationUnauthorizedState reason="no_tenant_context" />);
    expect(screen.getByText("Kein Vereinskontext")).toBeInTheDocument();
  });
});