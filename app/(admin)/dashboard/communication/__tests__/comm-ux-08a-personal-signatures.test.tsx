// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));
vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: vi.fn(async () => ({ id: "t1", key: "demo" })),
}));
vi.mock("@/lib/communication/personal-signature/personal-signature-service", () => ({
  loadPersonalSignaturePreference: vi.fn(async () => ({
    bodyText: null,
    contentJson: null,
    contentVersion: 1,
    useByDefault: true,
    hasStoredPreference: false,
  })),
}));

import PersonalSignaturePage from "../personal-signature/page";
import { render, screen } from "@testing-library/react";

describe("COMM-UX-08A personal signature settings route", () => {
  it("renders Persönliche Signatur workspace heading", async () => {
    render(await PersonalSignaturePage());
    expect(screen.getByRole("heading", { name: "Persönliche Signatur" })).toBeInTheDocument();
    expect(screen.getByLabelText("Signatur bearbeiten")).toBeInTheDocument();
  });

  it("registers hub link to personal signature settings", () => {
    const hub = readFileSync(
      join(process.cwd(), "components/admin/communication/hub/CommunicationHubView.tsx"),
      "utf8",
    );
    expect(hub).toContain("/dashboard/communication/personal-signature");
    expect(hub).toContain("Persönliche Signatur");
  });

  it("keeps email sender workspace separate from personal signature", () => {
    const page = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/communication/personal-signature/page.tsx"),
      "utf8",
    );
    expect(page).toContain("E-Mail-Absender (Verein)");
    expect(page).not.toContain("EmailSenderWorkspace");
  });
});
