import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import deMessages from "@/messages/de.json";
import {
  FINANCE_CAPABILITY_PRESENTATION,
  FINANCE_CAPABILITY_PRESENTATION_ORDER,
  filterFinanceStarterRecommendedCapabilityKeys,
} from "@/lib/finance/capability-presentation";
import {
  FINANCE_DEFAULT_ENABLED_CAPABILITIES,
  FINANCE_STARTER_RECOMMENDED_CAPABILITY_KEYS,
  FINANCE_SYSTEM_CAPABILITY_KEYS,
  isFinanceCapabilityImplemented,
} from "@/lib/finance/capability-registry";
import { FINANCE_CAPABILITY_KEYS } from "@/lib/finance/finance-architecture";
import { ensureDefaultFinanceCapabilities } from "@/lib/finance/services/finance-capability-service";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("FIN-01B-R3 finance capability presentation", () => {
  it('uses "Funktionen" as the German setup section label', () => {
    expect(deMessages.Finance.settings.capabilitiesTitle).toBe("Funktionen");
    expect(deMessages.Finance.settings.capabilitiesTitle).not.toBe("Fähigkeiten");
  });

  it("maps every canonical capability key to presentation metadata", () => {
    expect(FINANCE_CAPABILITY_PRESENTATION_ORDER.map((row) => row.key)).toEqual([
      ...FINANCE_CAPABILITY_KEYS,
    ]);
    for (const key of FINANCE_CAPABILITY_KEYS) {
      const row = FINANCE_CAPABILITY_PRESENTATION[key];
      expect(row.labelKey).toBe(`capabilities.${key}`);
      expect(row.descriptionKey).toBe(`capabilityDescriptions.${key}`);
      expect(deMessages.Finance.capabilityDescriptions[key]).toBeTruthy();
    }
  });

  it("keeps capability keys unchanged", () => {
    expect([...FINANCE_SYSTEM_CAPABILITY_KEYS]).toEqual([...FINANCE_CAPABILITY_KEYS]);
  });

  it("exposes descriptions via registry keys in FinanceSettingsPanel", () => {
    const panel = read("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain("FINANCE_CAPABILITY_PRESENTATION_ORDER");
    expect(panel).toContain("presentation.descriptionKey");
    expect(panel).not.toMatch(/capabilityDescriptions\.[A-Z_]+/);
  });

  it("keeps starter guidance non-mutating and availability-aware", () => {
    expect(FINANCE_STARTER_RECOMMENDED_CAPABILITY_KEYS).toEqual(["OVERVIEW", "BUDGETING", "ACTUALS"]);
    expect(
      filterFinanceStarterRecommendedCapabilityKeys(isFinanceCapabilityImplemented),
    ).toEqual(["OVERVIEW", "BUDGETING", "ACTUALS"]);
    expect(FINANCE_DEFAULT_ENABLED_CAPABILITIES).toEqual(["OVERVIEW"]);
    expect(ensureDefaultFinanceCapabilities.toString()).not.toContain("BUDGETING");
    expect(ensureDefaultFinanceCapabilities.toString()).not.toContain("ACTUALS");
    expect(read("components/admin/finance/FinanceSettingsPanel.tsx")).toContain(
      "starterNudgeTitle",
    );
    for (const key of FINANCE_STARTER_RECOMMENDED_CAPABILITY_KEYS) {
      expect(isFinanceCapabilityImplemented(key)).toBe(true);
    }
    expect(
      filterFinanceStarterRecommendedCapabilityKeys(() => true),
    ).toEqual(["OVERVIEW", "BUDGETING", "ACTUALS"]);
  });

  it("does not recommend unavailable capabilities in starter nudge copy", () => {
    const body = deMessages.Finance.settings.starterNudgeBody as string;
    expect(deMessages.Finance.settings.starterNudgeTitle).toBe("Empfohlen für den Start");
    expect(body).toBe(
      "Startet mit der Übersicht. Weitere Finanzfunktionen werden schrittweise verfügbar und können später jederzeit ergänzt werden.",
    );
    expect(body).not.toMatch(/Budgetierung|Ist-Werte/i);
    for (const key of FINANCE_CAPABILITY_KEYS) {
      if (!isFinanceCapabilityImplemented(key)) {
        const label = deMessages.Finance.capabilities[key] as string;
        expect(body).not.toContain(label);
      }
    }
  });

  it("separates capability availability from tenant enabled state in settings rows", () => {
    const settingsPage = read("app/(admin)/dashboard/finance/settings/page.tsx");
    expect(settingsPage).toContain("configurable: isFinanceCapabilityImplemented");
    expect(settingsPage).toContain("enabled: workspace.enabledCapabilities");
    const panel = read("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain("capabilityNotAvailable");
    expect(panel).toContain("disabled={!available || pending}");
    expect(panel).toContain("row.configurable");
    expect(panel).toContain("row.enabled");
  });

  it("keeps unavailable capability toggles disabled and subordinate to status text", () => {
    const panel = read("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain("finance-cap-status-");
    expect(panel).toContain("aria-describedby={!available ? statusId : titleId}");
    expect(panel).toMatch(/if \(!available\)/);
  });

  it("preserves production-readiness gating for unavailable capabilities", () => {
    for (const key of FINANCE_CAPABILITY_KEYS) {
      if (!isFinanceCapabilityImplemented(key)) {
        expect(isFinanceCapabilityImplemented(key)).toBe(false);
      }
    }
    expect(isFinanceCapabilityImplemented("OVERVIEW")).toBe(true);
  });

  it("uses canonical switch toggles without new checkboxes", () => {
    const panel = read("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain("SwitchThumb");
    expect(panel).toContain("@/components/ui/SwitchToggle");
    expect(panel).not.toContain('type="checkbox"');
  });
});
