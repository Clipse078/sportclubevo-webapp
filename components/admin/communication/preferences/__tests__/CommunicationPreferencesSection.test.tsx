import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("CommunicationPreferencesSection UX contract", () => {
  it("exposes German labels, grouped sections, and mobile-safe overflow table", () => {
    const source = readFileSync(
      join(process.cwd(), "components/admin/communication/preferences/CommunicationPreferencesSection.tsx"),
      "utf8",
    );
    expect(source).toContain("Kommunikation & Benachrichtigungen");
    expect(source).toContain("Vereinskommunikation");
    expect(source).toContain("Sponsoren & Partner");
    expect(source).toContain("Immer aktiv");
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("Zielgruppenmitgliedschaft ist");
    expect(source).toContain("keine Einwilligung");
  });
});
