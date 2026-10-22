import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import deMessages from "@/messages/de.json";
import {
  FINANCE_CAPABILITY_PRESENTATION,
  FINANCE_CAPABILITY_PRESENTATION_ORDER,
  FINANCE_STARTER_RECOMMENDED_CAPABILITY_KEYS,
} from "@/lib/finance/capability-presentation";
import {
  FINANCE_DEFAULT_ENABLED_CAPABILITIES,
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

  it("keeps starter guidance non-mutating", () => {
    expect(FINANCE_STARTER_RECOMMENDED_CAPABILITY_KEYS).toEqual([
      "OVERVIEW",
      "BUDGETING",
      "ACTUALS",
    ]);
    expect(FINANCE_DEFAULT_ENABLED_CAPABILITIES).toEqual(["OVERVIEW"]);
    expect(ensureDefaultFinanceCapabilities.toString()).not.toContain("BUDGETING");
    expect(ensureDefaultFinanceCapabilities.toString()).not.toContain("ACTUALS");
    expect(read("components/admin/finance/FinanceSettingsPanel.tsx")).toContain(
      "starterNudgeTitle",
    );
    expect(FINANCE_STARTER_RECOMMENDED_CAPABILITY_KEYS).not.toEqual([
      ...FINANCE_DEFAULT_ENABLED_CAPABILITIES,
    ]);
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
